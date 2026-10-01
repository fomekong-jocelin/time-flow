package cm.indyli.timeflow.auth.persistence;

import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.UserRole;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUserEntity {

    public static final int DEFAULT_WEEKLY_TARGET_MINUTES = 2100;

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    private AccountType accountType;

    @Column(name = "manager_id")
    private UUID managerId;

    @Column(name = "weekly_target_minutes", nullable = false)
    private int weeklyTargetMinutes = DEFAULT_WEEKLY_TARGET_MINUTES;

    @Column(name = "work_schedule_profile_id")
    private UUID workScheduleProfileId;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AppUserEntity() {
    }

    public static AppUserEntity local(String email, String displayName, UserRole role) {
        return create(email, displayName, role, AccountType.LOCAL);
    }

    public static AppUserEntity sso(String email, String displayName, UserRole role) {
        return create(email, displayName, role, AccountType.SSO);
    }

    private static AppUserEntity create(String email, String displayName, UserRole role, AccountType accountType) {
        var now = OffsetDateTime.now();
        var user = new AppUserEntity();
        user.id = UUID.randomUUID();
        user.email = email.trim().toLowerCase(Locale.ROOT);
        user.displayName = displayName.trim();
        user.role = role;
        user.accountType = accountType;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UserRole getRole() { return role; }
    public AccountType getAccountType() { return accountType; }
    public UUID getManagerId() { return managerId; }
    public int getWeeklyTargetMinutes() { return weeklyTargetMinutes; }
    public boolean isActive() { return active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void updateIdentityProfile(String email, String displayName) {
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.displayName = displayName.trim();
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getWorkScheduleProfileId() { return workScheduleProfileId; }
    public void setWorkScheduleProfileId(UUID workScheduleProfileId) { this.workScheduleProfileId = workScheduleProfileId; }

    public void updateAdministrativeProfile(String displayName, UserRole role, UUID managerId, int weeklyTargetMinutes) {
        updateAdministrativeProfile(displayName, role, managerId, weeklyTargetMinutes, this.workScheduleProfileId);
    }

    public void updateAdministrativeProfile(String displayName, UserRole role, UUID managerId, int weeklyTargetMinutes, UUID workScheduleProfileId) {
        this.displayName = displayName.trim();
        this.role = role;
        this.managerId = managerId;
        this.weeklyTargetMinutes = weeklyTargetMinutes;
        this.workScheduleProfileId = workScheduleProfileId;
        this.updatedAt = OffsetDateTime.now();
    }

    public void changeActive(boolean active) {
        this.active = active;
        this.updatedAt = OffsetDateTime.now();
    }
}
