package cm.indyli.timeflow.auth.persistence;

import cm.indyli.timeflow.auth.domain.UserRole;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUserEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    @Column(name = "weekly_target_minutes", nullable = false)
    private int weeklyTargetMinutes = 2100;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AppUserEntity() {
    }

    public static AppUserEntity create(String email, String displayName, UserRole role) {
        var now = OffsetDateTime.now();
        var user = new AppUserEntity();
        user.id = UUID.randomUUID();
        user.email = email.trim().toLowerCase();
        user.displayName = displayName.trim();
        user.role = role;
        user.createdAt = now;
        user.updatedAt = now;
        return user;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UserRole getRole() { return role; }
    public int getWeeklyTargetMinutes() { return weeklyTargetMinutes; }
    public boolean isActive() { return active; }

    public void updateIdentityProfile(String email, String displayName) {
        this.email = email.trim().toLowerCase();
        this.displayName = displayName.trim();
        this.updatedAt = OffsetDateTime.now();
    }
}
