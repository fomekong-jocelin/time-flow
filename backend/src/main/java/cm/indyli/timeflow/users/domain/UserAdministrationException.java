package cm.indyli.timeflow.users.domain;

/**
 * Administrative change refused by a business rule. The code is stable and safe to expose.
 */
public class UserAdministrationException extends RuntimeException {

    private final String code;

    public UserAdministrationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
