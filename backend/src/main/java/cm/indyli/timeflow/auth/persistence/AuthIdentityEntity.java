package cm.indyli.timeflow.auth.persistence;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "auth_identity")
public class AuthIdentityEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AuthProvider provider;

    @Column(nullable = false, length = 320)
    private String subject;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AuthIdentityEntity() {
    }

    public static AuthIdentityEntity local(AppUserEntity user, String normalizedEmail, String passwordHash) {
        return create(user, AuthProvider.LOCAL, normalizedEmail, passwordHash);
    }

    public static AuthIdentityEntity entra(AppUserEntity user, String subject) {
        return create(user, AuthProvider.ENTRA, subject, null);
    }

    private static AuthIdentityEntity create(AppUserEntity user, AuthProvider provider, String subject, String passwordHash) {
        var now = OffsetDateTime.now();
        var identity = new AuthIdentityEntity();
        identity.id = UUID.randomUUID();
        identity.user = user;
        identity.provider = provider;
        identity.subject = subject;
        identity.passwordHash = passwordHash;
        identity.createdAt = now;
        identity.updatedAt = now;
        return identity;
    }

    public AppUserEntity getUser() { return user; }
    public AuthProvider getProvider() { return provider; }
    public String getSubject() { return subject; }
    public String getPasswordHash() { return passwordHash; }
    public boolean isEnabled() { return enabled; }
    public int getFailedAttempts() { return failedAttempts; }
    public OffsetDateTime getLockedUntil() { return lockedUntil; }
    public OffsetDateTime getLastLoginAt() { return lastLoginAt; }

    public boolean isLockedAt(OffsetDateTime now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public void registerFailure(int maxAttempts, long lockMinutes) {
        failedAttempts++;
        if (failedAttempts >= maxAttempts) {
            lockedUntil = OffsetDateTime.now().plusMinutes(lockMinutes);
            failedAttempts = 0;
        }
        updatedAt = OffsetDateTime.now();
    }

    public void resetPassword(String passwordHash) {
        this.passwordHash = passwordHash;
        unlock();
    }

    public void unlock() {
        failedAttempts = 0;
        lockedUntil = null;
        updatedAt = OffsetDateTime.now();
    }

    public void registerSuccess() {
        failedAttempts = 0;
        lockedUntil = null;
        lastLoginAt = OffsetDateTime.now();
        updatedAt = lastLoginAt;
    }
}
