CREATE TABLE work_schedule_profile (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    weekly_target_minutes INT NOT NULL DEFAULT 2100,
    daily_target_minutes INT NOT NULL DEFAULT 420,
    max_daily_minutes INT NOT NULL DEFAULT 600,
    max_weekly_minutes INT NOT NULL DEFAULT 2880,
    working_days VARCHAR(100) NOT NULL DEFAULT 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    allow_weekend_entry BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profils types du marché ESN / Conseil
INSERT INTO work_schedule_profile (id, code, name, description, weekly_target_minutes, daily_target_minutes, max_daily_minutes, max_weekly_minutes, working_days, allow_weekend_entry, is_default, active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'STANDARD_35H',
    'Temps plein standard (35 h)',
    'Régime standard 35 heures réparties sur 5 jours ouvrés (7 h / jour, Lun-Ven)',
    2100, 420, 600, 2880,
    'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    FALSE, TRUE, TRUE
);

INSERT INTO work_schedule_profile (id, code, name, description, weekly_target_minutes, daily_target_minutes, max_daily_minutes, max_weekly_minutes, working_days, allow_weekend_entry, is_default, active)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'CADRE_38H30',
    'Cadres & RTT (38 h 30)',
    'Forfait hebdomadaire 38 h 30 avec acquisition de jours de RTT (7 h 42 / jour, Lun-Ven)',
    2310, 462, 720, 2880,
    'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    FALSE, FALSE, TRUE
);

INSERT INTO work_schedule_profile (id, code, name, description, weekly_target_minutes, daily_target_minutes, max_daily_minutes, max_weekly_minutes, working_days, allow_weekend_entry, is_default, active)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'PART_TIME_80_WED',
    'Temps partiel 80% (Mercredi libéré)',
    '4 jours par semaine (Lundi, Mardi, Jeudi, Vendredi - 7 h / jour, 28 h hebdo)',
    1680, 420, 600, 2400,
    'MONDAY,TUESDAY,THURSDAY,FRIDAY',
    FALSE, FALSE, TRUE
);

INSERT INTO work_schedule_profile (id, code, name, description, weekly_target_minutes, daily_target_minutes, max_daily_minutes, max_weekly_minutes, working_days, allow_weekend_entry, is_default, active)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'FLEX_ASTREINTE',
    'Support & Astreinte (Week-end autorisé)',
    'Équipe d''astreinte ou intervention technique continue avec autorisation de saisie le week-end',
    2100, 420, 720, 3600,
    'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY',
    TRUE, FALSE, TRUE
);

ALTER TABLE app_user ADD COLUMN work_schedule_profile_id UUID REFERENCES work_schedule_profile(id);

UPDATE app_user SET work_schedule_profile_id = '00000000-0000-0000-0000-000000000001' WHERE work_schedule_profile_id IS NULL;

CREATE INDEX idx_app_user_work_schedule ON app_user(work_schedule_profile_id);
