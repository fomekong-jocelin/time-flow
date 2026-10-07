package cm.indyli.timeflow.projects.infrastructure;

import cm.indyli.timeflow.projects.domain.RemoteProject;
import cm.indyli.timeflow.projects.domain.ExcelProject;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProjectStore {
    private final JdbcClient jdbc;

    public ProjectStore(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<ProjectView> list() {
        return jdbc.sql("""
                SELECT id, name, external_source, organization_key, active, billable_default, external_id,
                       daily_rate, budget_days, total_price, currency
                FROM project ORDER BY lower(name), id
                """).query((rs, row) -> new ProjectView(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getString("external_source"),
                        rs.getString("organization_key"),
                        rs.getBoolean("active"),
                        rs.getBoolean("billable_default"),
                        rs.getString("external_id"),
                        rs.getBigDecimal("daily_rate"),
                        rs.getBigDecimal("budget_days"),
                        rs.getBigDecimal("total_price"),
                        rs.getString("currency") != null ? rs.getString("currency") : "EUR"
                )).list();
    }

    public java.util.Optional<ProjectView> findById(UUID id) {
        return jdbc.sql("""
                SELECT id, name, external_source, organization_key, active, billable_default, external_id,
                       daily_rate, budget_days, total_price, currency
                FROM project WHERE id = :id
                """).param("id", id)
                .query((rs, row) -> new ProjectView(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getString("external_source"),
                        rs.getString("organization_key"),
                        rs.getBoolean("active"),
                        rs.getBoolean("billable_default"),
                        rs.getString("external_id"),
                        rs.getBigDecimal("daily_rate"),
                        rs.getBigDecimal("budget_days"),
                        rs.getBigDecimal("total_price"),
                        rs.getString("currency") != null ? rs.getString("currency") : "EUR"
                )).optional();
    }

    public UUID startRun() {
        return startRun("AZURE_DEVOPS");
    }

    public UUID startRun(String type) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO integration_sync_run (id, integration_type, started_at, status)
                VALUES (:id, :type, NOW(), 'RUNNING')
                """).param("id", id).param("type", type).update();
        return id;
    }

    @Transactional
    public void importProjects(UUID runId, String organization, List<RemoteProject> projects) {
        // Serialize database imports across application instances, preserving unique external identity.
        jdbc.sql("LOCK TABLE project IN SHARE ROW EXCLUSIVE MODE").update();
        for (var project : projects) {
            jdbc.sql("""
                    INSERT INTO project (id, external_source, external_id, organization_key, name, active)
                    VALUES (:id, 'AZURE_DEVOPS', :externalId, :organization, :name, :active)
                    ON CONFLICT (external_source, organization_key, external_id)
                    DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active, updated_at = NOW()
                    """).param("id", UUID.randomUUID()).param("externalId", project.id().toString())
                    .param("organization", organization).param("name", project.name())
                    .param("active", project.active()).update();
        }
        jdbc.sql("""
                UPDATE integration_sync_run SET status = 'SUCCESS', finished_at = NOW(), imported_count = :count
                WHERE id = :id
                """).param("count", projects.size()).param("id", runId).update();
    }

    public void failRun(UUID id) {
        jdbc.sql("""
                UPDATE integration_sync_run SET status = 'FAILED', finished_at = NOW(),
                error_message = 'Import impossible. Vérifiez la source et sa configuration.'
                WHERE id = :id
                """).param("id", id).update();
    }

    public SyncView latestRun() {
        return jdbc.sql("""
                SELECT status, started_at, imported_count FROM integration_sync_run
                WHERE integration_type = 'AZURE_DEVOPS' ORDER BY started_at DESC LIMIT 1
                """).query((rs, row) -> new SyncView(rs.getString("status"),
                rs.getTimestamp("started_at").toInstant(), rs.getInt("imported_count"))).optional().orElse(null);
    }

    @Transactional
    public UUID create(String name, boolean active, boolean billableDefault,
                       BigDecimal dailyRate, BigDecimal budgetDays, BigDecimal totalPrice, String currency) {
        UUID id = UUID.randomUUID();
        String safeCurrency = (currency == null || currency.isBlank()) ? "EUR" : currency.trim().toUpperCase();
        jdbc.sql("""
                INSERT INTO project (id, external_source, organization_key, name, active, billable_default,
                                     daily_rate, budget_days, total_price, currency, created_at, updated_at)
                VALUES (:id, 'INTERNAL', 'LOCAL', :name, :active, :billableDefault,
                        :dailyRate, :budgetDays, :totalPrice, :currency, NOW(), NOW())
                """)
                .param("id", id)
                .param("name", name)
                .param("active", active)
                .param("billableDefault", billableDefault)
                .param("dailyRate", dailyRate)
                .param("budgetDays", budgetDays)
                .param("totalPrice", totalPrice)
                .param("currency", safeCurrency)
                .update();
        return id;
    }

    @Transactional
    public void update(UUID id, String name, boolean active, boolean billableDefault,
                       BigDecimal dailyRate, BigDecimal budgetDays, BigDecimal totalPrice, String currency) {
        String safeCurrency = (currency == null || currency.isBlank()) ? "EUR" : currency.trim().toUpperCase();
        int updated = jdbc.sql("""
                UPDATE project
                SET name = :name, active = :active, billable_default = :billableDefault,
                    daily_rate = :dailyRate, budget_days = :budgetDays, total_price = :totalPrice,
                    currency = :currency, updated_at = NOW()
                WHERE id = :id
                """)
                .param("id", id)
                .param("name", name)
                .param("active", active)
                .param("billableDefault", billableDefault)
                .param("dailyRate", dailyRate)
                .param("budgetDays", budgetDays)
                .param("totalPrice", totalPrice)
                .param("currency", safeCurrency)
                .update();
        if (updated == 0) {
            throw new IllegalArgumentException("Projet introuvable : " + id);
        }
    }

    public record ProjectView(
            UUID id,
            String name,
            String source,
            String organization,
            boolean active,
            boolean billableDefault,
            String reference,
            BigDecimal dailyRate,
            BigDecimal budgetDays,
            BigDecimal totalPrice,
            String currency
    ) {
        public ProjectView(UUID id, String name, String source, String organization,
                           boolean active, boolean billableDefault, String reference,
                           BigDecimal dailyRate) {
            this(id, name, source, organization, active, billableDefault, reference, dailyRate, null, null, "EUR");
        }

        public ProjectView(UUID id, String name, String source, String organization,
                           boolean active, boolean billableDefault, String reference) {
            this(id, name, source, organization, active, billableDefault, reference, null, null, null, "EUR");
        }
    }

    public record SyncView(String status, Instant startedAt, int importedCount) { }

    @Transactional
    public void importExcel(UUID runId, List<ExcelProject> projects) {
        jdbc.sql("LOCK TABLE project IN SHARE ROW EXCLUSIVE MODE").update();
        for (var project : projects) {
            jdbc.sql("""
                    INSERT INTO project (id, external_source, external_id, organization_key, name, active, billable_default,
                                         daily_rate, budget_days, total_price, currency)
                    VALUES (:id, 'EXCEL', :reference, 'LOCAL', :name, :active, :billable,
                            :dailyRate, :budgetDays, :totalPrice, :currency)
                    ON CONFLICT (external_source, organization_key, external_id)
                    DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active,
                    billable_default = EXCLUDED.billable_default,
                    daily_rate = COALESCE(EXCLUDED.daily_rate, project.daily_rate),
                    budget_days = COALESCE(EXCLUDED.budget_days, project.budget_days),
                    total_price = COALESCE(EXCLUDED.total_price, project.total_price),
                    currency = COALESCE(EXCLUDED.currency, project.currency),
                    updated_at = NOW()
                    """).param("id", UUID.randomUUID())
                    .param("reference", project.reference())
                    .param("name", project.name())
                    .param("active", project.active())
                    .param("billable", project.billable())
                    .param("dailyRate", project.dailyRate())
                    .param("budgetDays", project.budgetDays())
                    .param("totalPrice", project.totalPrice())
                    .param("currency", project.currency() != null ? project.currency() : "EUR")
                    .update();
        }
        jdbc.sql("""
                UPDATE integration_sync_run SET status = 'SUCCESS', finished_at = NOW(), imported_count = :count
                WHERE id = :id
                """).param("count", projects.size()).param("id", runId).update();
    }
}
