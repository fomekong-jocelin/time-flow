package cm.indyli.timeflow.users.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.stream.Stream;

/**
 * Deletes the server-side sessions of a user so role, status or password changes apply immediately.
 * Local sessions are indexed by email, Entra sessions by the OIDC subject.
 */
@Component
public class UserSessionRevoker {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserSessionRevoker.class);

    private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> sessions;

    public UserSessionRevoker(ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> sessions) {
        this.sessions = sessions;
    }

    public void revoke(String... principalNames) {
        var repository = sessions.getIfAvailable();
        if (repository == null) {
            LOGGER.warn("No indexed session repository available; sessions were not revoked.");
            return;
        }
        Stream.of(principalNames)
                .filter(Objects::nonNull)
                .distinct()
                .flatMap(name -> repository.findByPrincipalName(name).keySet().stream())
                .forEach(repository::deleteById);
    }
}
