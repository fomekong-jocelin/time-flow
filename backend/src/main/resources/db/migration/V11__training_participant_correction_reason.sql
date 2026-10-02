-- Additive: do not rewrite V9/V10 or change existing participants/presences.
ALTER TABLE training_participant_event ADD COLUMN reason VARCHAR(500);
ALTER TABLE training_participant_event ADD COLUMN event_kind VARCHAR(32);
-- Legacy event kinds remain NULL. A migration snapshot is not a reliable attendance timestamp.
ALTER TABLE training_participant_event ADD CONSTRAINT ck_training_correction_reason CHECK (
    event_kind IS DISTINCT FROM 'ADMIN_CORRECTION'
    OR (reason IS NOT NULL AND length(btrim(reason)) BETWEEN 5 AND 500 AND actor_id IS NOT NULL)
);
