-- Table des sessions de formation
CREATE TABLE training_session (
    id UUID PRIMARY KEY,
    reference VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    trainer_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
    location VARCHAR(200),
    delivery_mode VARCHAR(20) NOT NULL DEFAULT 'REMOTE',
    category VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 7.0,
    max_participants INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table de liaison des participants aux formations
CREATE TABLE training_participant (
    id UUID PRIMARY KEY,
    training_id UUID NOT NULL REFERENCES training_session(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_training_user UNIQUE (training_id, user_id)
);

CREATE INDEX idx_training_session_dates ON training_session(start_date, end_date);
CREATE INDEX idx_training_session_status ON training_session(status);
CREATE INDEX idx_training_session_trainer ON training_session(trainer_id);
CREATE INDEX idx_training_participant_user ON training_participant(user_id);

-- Sessions initiales de démonstration
INSERT INTO training_session (id, reference, title, description, location, delivery_mode, category, status, start_date, end_date, duration_hours, max_participants)
VALUES
    ('00000000-0000-0000-0001-000000000001', 'TRN-ANG-01', 'Angular 22 & Architecture Zoneless', 'Maîtrise des Signals, architecture sans zone.js et composants standalone performants.', 'Paris / Teams', 'HYBRID', 'INTERNAL', 'PLANNED', '2026-10-15', '2026-10-16', 14.0, 12),
    ('00000000-0000-0000-0001-000000000002', 'TRN-SEC-02', 'Sécurité Spring Boot & OWASP API Top 10', 'Bonnes pratiques d''authentification, protection CSRF, isolation de domaine et audit de sécurité.', 'Teams', 'REMOTE', 'INTERNAL', 'PLANNED', '2026-11-05', '2026-11-05', 7.0, 15);
