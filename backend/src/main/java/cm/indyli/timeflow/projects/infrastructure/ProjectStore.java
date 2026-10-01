package cm.indyli.timeflow.projects.infrastructure;

import cm.indyli.timeflow.projects.domain.RemoteProject;
import cm.indyli.timeflow.projects.domain.ExcelProject;
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
                SELECT id, name, external_source, organization_key, active, billable_default, external_id
                FROM project ORDER BY lower(name), id
                """).query((rs, row) -> new ProjectView(rs.getObject("id", UUID.class), rs.getString("name"),
                rs.getString("external_source"), rs.getString("organization_key"), rs.getBoolean("active"),
                rs.getBoolean("billable_default"), rs.getString("external_id"))).list();
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

    public record ProjectView(UUID id, String name, String source, String organization,
                              boolean active, boolean billableDefault, String reference) { }
    public record SyncView(String status, Instant startedAt, int importedCount) { }

    @Transactional
    public void importExcel(UUID runId, List<ExcelProject> projects) {
        jdbc.sql("LOCK TABLE project IN SHARE ROW EXCLUSIVE MODE").update();
        for (var project : projects) {
            jdbc.sql("""
                    INSERT INTO project (id, external_source, external_id, organization_key, name, active, billable_default)
                    VALUES (:id, 'EXCEL', :reference, 'LOCAL', :name, :active, :billable)
                    ON CONFLICT (external_source, organization_key, external_id)
                    DO UPDATE SET name = EXCLUDED.name, active = EXCLUDED.active,
                    billable_default = EXCLUDED.billable_default, updated_at = NOW()
                    """).param("id", UUID.randomUUID()).param("reference", project.reference())
                    .param("name", project.name()).param("active", project.active())
                    .param("billable", project.billable()).update();
        }
        jdbc.sql("""
                UPDATE integration_sync_run SET status = 'SUCCESS', finished_at = NOW(), imported_count = :count
                WHERE id = :id
                """).param("count", projects.size()).param("id", runId).update();
    }
}
