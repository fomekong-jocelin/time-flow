package cm.indyli.timeflow.users.domain;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException() {
        super("Utilisateur introuvable.");
    }
}
