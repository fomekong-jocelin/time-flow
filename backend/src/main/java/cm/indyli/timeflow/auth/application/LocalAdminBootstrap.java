package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class LocalAdminBootstrap implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalAdminBootstrap.class);

    private final AuthProperties properties;
    private final AppUserRepository userRepository;
    private final LocalUserAdminService localUserAdminService;

    public LocalAdminBootstrap(AuthProperties properties,
                               AppUserRepository userRepository,
                               LocalUserAdminService localUserAdminService) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.localUserAdminService = localUserAdminService;
    }

    @Override
    public void run(ApplicationArguments args) {
        var email = trimToNull(properties.getBootstrapLocalAdminEmail());
        var password = trimToNull(properties.getBootstrapLocalAdminPassword());

        if (email == null && password == null) {
            return;
        }

        if (email == null || password == null) {
            throw new IllegalStateException(
                    "TIMEFLOW_BOOTSTRAP_ADMIN_EMAIL and TIMEFLOW_BOOTSTRAP_ADMIN_PASSWORD must be configured together"
            );
        }

        if (password.length() < 12) {
            throw new IllegalStateException("Bootstrap admin password must contain at least 12 characters");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            LOGGER.info("Bootstrap local administrator already exists; no password or role was changed");
            return;
        }

        var displayName = trimToNull(properties.getBootstrapLocalAdminDisplayName());
        if (displayName == null) {
            displayName = "Administrateur TimeFlow";
        }

        localUserAdminService.create(email, displayName, UserRole.ADMIN, password);
        LOGGER.warn(
                "Initial TimeFlow local administrator created. Remove TIMEFLOW_BOOTSTRAP_ADMIN_PASSWORD from the environment before the next startup."
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
