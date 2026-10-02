-- Additive migration: never rewrite V9 or invent times for existing date-only sessions.
ALTER TABLE training_session ADD COLUMN starts_at TIMESTAMPTZ;
ALTER TABLE training_session ADD COLUMN ends_at TIMESTAMPTZ;
ALTER TABLE training_session ADD COLUMN time_zone VARCHAR(64);
ALTER TABLE training_session ADD CONSTRAINT ck_training_schedule CHECK (
    (starts_at IS NULL AND ends_at IS NULL AND time_zone IS NULL) OR
    (starts_at IS NOT NULL AND ends_at IS NOT NULL AND time_zone IS NOT NULL AND ends_at > starts_at)
);
-- NOT VALID protects future writes without silently changing invalid legacy records.
ALTER TABLE training_session ADD CONSTRAINT ck_training_dates CHECK (end_date >= start_date) NOT VALID;
ALTER TABLE training_session ADD CONSTRAINT ck_training_capacity CHECK (max_participants BETWEEN 1 AND 500) NOT VALID;
ALTER TABLE training_session ADD CONSTRAINT ck_training_duration CHECK (duration_hours >= 0.5) NOT VALID;
CREATE TABLE training_participant_event (
    participant_id UUID NOT NULL REFERENCES training_participant(id) ON DELETE CASCADE,
    event_index INT NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    actor_id UUID,
    PRIMARY KEY (participant_id, event_index)
);
-- Snapshot at migration time. registered_at stays unchanged on the participation itself; no past transitions are invented.
INSERT INTO training_participant_event(participant_id, event_index, from_status, to_status, changed_at, actor_id)
SELECT id, 0, NULL, status, CURRENT_TIMESTAMP, NULL FROM training_participant;
CREATE INDEX idx_training_participant_occupancy ON training_participant(training_id, status);
