package cm.indyli.timeflow.auth.domain;

/**
 * Exclusive way a TimeFlow account signs in: Microsoft Entra ID SSO or a local password.
 */
public enum AccountType {
    LOCAL,
    SSO
}
