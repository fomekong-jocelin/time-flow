package cm.indyli.timeflow.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "timeflow.auth")
public class AuthProperties {

    private String frontendUrl = "http://localhost:4200";
    private boolean ssoEnabled;
    private int maxFailedAttempts = 5;
    private long lockDurationMinutes = 15;
    private List<String> bootstrapAdminEmails = new ArrayList<>();
    private boolean autoBootstrapLocalAdmin = true;
    private String bootstrapLocalAdminEmail = "admin@indyli-services.com";
    private String bootstrapLocalAdminDisplayName = "Administrateur TimeFlow";

    public String getFrontendUrl() {
        return frontendUrl;
    }

    public void setFrontendUrl(String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public boolean isSsoEnabled() {
        return ssoEnabled;
    }

    public void setSsoEnabled(boolean ssoEnabled) {
        this.ssoEnabled = ssoEnabled;
    }

    public int getMaxFailedAttempts() {
        return maxFailedAttempts;
    }

    public void setMaxFailedAttempts(int maxFailedAttempts) {
        this.maxFailedAttempts = maxFailedAttempts;
    }

    public long getLockDurationMinutes() {
        return lockDurationMinutes;
    }

    public void setLockDurationMinutes(long lockDurationMinutes) {
        this.lockDurationMinutes = lockDurationMinutes;
    }

    public List<String> getBootstrapAdminEmails() {
        return bootstrapAdminEmails;
    }

    public void setBootstrapAdminEmails(List<String> bootstrapAdminEmails) {
        this.bootstrapAdminEmails = bootstrapAdminEmails == null ? new ArrayList<>() : bootstrapAdminEmails;
    }

    public boolean isAutoBootstrapLocalAdmin() {
        return autoBootstrapLocalAdmin;
    }

    public void setAutoBootstrapLocalAdmin(boolean autoBootstrapLocalAdmin) {
        this.autoBootstrapLocalAdmin = autoBootstrapLocalAdmin;
    }

    public String getBootstrapLocalAdminEmail() {
        return bootstrapLocalAdminEmail;
    }

    public void setBootstrapLocalAdminEmail(String bootstrapLocalAdminEmail) {
        this.bootstrapLocalAdminEmail = bootstrapLocalAdminEmail;
    }

    public String getBootstrapLocalAdminDisplayName() {
        return bootstrapLocalAdminDisplayName;
    }

    public void setBootstrapLocalAdminDisplayName(String bootstrapLocalAdminDisplayName) {
        this.bootstrapLocalAdminDisplayName = bootstrapLocalAdminDisplayName;
    }
}
