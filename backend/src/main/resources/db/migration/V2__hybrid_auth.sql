CREATE TABLE auth_identity (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    subject VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_auth_identity_provider_subject UNIQUE (provider, subject),
    CONSTRAINT uq_auth_identity_user_provider UNIQUE (user_id, provider),
    CONSTRAINT ck_auth_identity_local_password CHECK (
        (provider = 'LOCAL' AND password_hash IS NOT NULL)
        OR (provider <> 'LOCAL')
    )
);

CREATE INDEX idx_auth_identity_user ON auth_identity(user_id);
CREATE INDEX idx_auth_identity_locked_until ON auth_identity(locked_until) WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN app_user.external_identity IS 'Deprecated: identities are stored in auth_identity from V2 onward.';
