package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class LocalAdminBootstrap implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(LocalAdminBootstrap.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final char[] PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_+".toCharArray();
    private static final int PASSWORD_LENGTH = 20;

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
        if (!properties.isAutoBootstrapLocalAdmin()) {
            return;
        }

        var email = properties.getBootstrapLocalAdminEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            LOGGER.info("TimeFlow local administrator already exists: {}. Password unchanged.", email);
            return;
        }

        var password = generatePassword();
        var displayName = properties.getBootstrapLocalAdminDisplayName();

        localUserAdminService.create(email, displayName, UserRole.ADMIN, password);

        LOGGER.warn("\n" +
                "============================================================\n" +
                " TIMEFLOW - INITIAL ADMINISTRATOR CREATED\n" +
                "------------------------------------------------------------\n" +
                " Email    : {}\n" +
                " Password : {}\n" +
                " Role     : ADMIN\n" +
                "------------------------------------------------------------\n" +
                " Save this password now. It will not be displayed again.\n" +
                "============================================================",
                email,
                password
        );
    }

    private String generatePassword() {
        var value = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            value.append(PASSWORD_ALPHABET[SECURE_RANDOM.nextInt(PASSWORD_ALPHABET.length)]);
        }
        return value.toString();
    }
}
