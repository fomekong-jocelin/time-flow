CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    external_identity VARCHAR(255) UNIQUE,
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) NOT NULL,
    weekly_target_minutes INTEGER NOT NULL DEFAULT 2100,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE client (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES client(id),
    external_source VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
    external_id VARCHAR(255),
    organization_key VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    external_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    billable_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_external UNIQUE (external_source, organization_key, external_id)
);

CREATE TABLE timesheet (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id),
    week_start DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    submitted_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_timesheet_user_week UNIQUE (user_id, week_start)
);

CREATE TABLE time_entry (
    id UUID PRIMARY KEY,
    timesheet_id UUID NOT NULL REFERENCES timesheet(id) ON DELETE CASCADE,
    project_id UUID REFERENCES project(id),
    activity_type VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
    billable BOOLEAN NOT NULL,
    comment VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE timesheet_validation (
    id UUID PRIMARY KEY,
    timesheet_id UUID NOT NULL REFERENCES timesheet(id),
    validator_user_id UUID NOT NULL REFERENCES app_user(id),
    decision VARCHAR(30) NOT NULL,
    comment VARCHAR(1000),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_sync_run (
    id UUID PRIMARY KEY,
    integration_type VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL,
    imported_count INTEGER NOT NULL DEFAULT 0,
    error_message VARCHAR(2000)
);

CREATE INDEX idx_time_entry_timesheet_date ON time_entry(timesheet_id, entry_date);
CREATE INDEX idx_project_active_name ON project(active, name);
CREATE INDEX idx_sync_run_type_started ON integration_sync_run(integration_type, started_at DESC);
