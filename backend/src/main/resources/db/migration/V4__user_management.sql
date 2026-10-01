ALTER TABLE app_user ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

UPDATE app_user u
SET account_type = 'SSO'
WHERE EXISTS (SELECT 1 FROM auth_identity i WHERE i.user_id = u.id AND i.provider = 'ENTRA');

ALTER TABLE app_user ADD CONSTRAINT ck_app_user_account_type CHECK (account_type IN ('LOCAL', 'SSO'));

ALTER TABLE app_user ADD COLUMN manager_id UUID REFERENCES app_user(id);
ALTER TABLE app_user ADD CONSTRAINT ck_app_user_manager_not_self CHECK (manager_id IS NULL OR manager_id <> id);
ALTER TABLE app_user ADD CONSTRAINT ck_app_user_weekly_target CHECK (weekly_target_minutes BETWEEN 0 AND 4200);

CREATE INDEX idx_app_user_manager ON app_user(manager_id) WHERE manager_id IS NOT NULL;

CREATE TABLE user_admin_audit (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    target_user_id UUID NOT NULL REFERENCES app_user(id),
    action VARCHAR(50) NOT NULL,
    details VARCHAR(1000),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_admin_audit_target ON user_admin_audit(target_user_id, occurred_at DESC);
