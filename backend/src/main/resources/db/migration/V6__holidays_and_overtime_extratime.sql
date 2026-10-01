-- Table des jours fériés légaux et d'entreprise
CREATE TABLE public_holiday (
    id UUID PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_worked BOOLEAN NOT NULL DEFAULT FALSE,
    year INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_public_holiday_year ON public_holiday(year);

-- Jours fériés légaux français 2026
INSERT INTO public_holiday (id, holiday_date, name, is_worked, year) VALUES
    ('00000000-0001-0000-0000-000000000001', '2026-01-01', 'Jour de l''An', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000002', '2026-04-06', 'Lundi de Pâques', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000003', '2026-05-01', 'Fête du Travail', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000004', '2026-05-08', 'Victoire 1945', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000005', '2026-05-14', 'Ascension', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000006', '2026-05-25', 'Lundi de Pentecôte', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000007', '2026-07-14', 'Fête Nationale', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000008', '2026-08-15', 'Assomption', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000009', '2026-11-01', 'Toussaint', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000010', '2026-11-11', 'Armistice 1918', FALSE, 2026),
    ('00000000-0001-0000-0000-000000000011', '2026-12-25', 'Noël', FALSE, 2026);

-- Jours fériés légaux français 2027
INSERT INTO public_holiday (id, holiday_date, name, is_worked, year) VALUES
    ('00000000-0002-0000-0000-000000000001', '2027-01-01', 'Jour de l''An', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000002', '2027-03-29', 'Lundi de Pâques', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000003', '2027-05-01', 'Fête du Travail', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000004', '2027-05-06', 'Ascension', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000005', '2027-05-08', 'Victoire 1945', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000006', '2027-05-17', 'Lundi de Pentecôte', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000007', '2027-07-14', 'Fête Nationale', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000008', '2027-08-15', 'Assomption', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000009', '2027-11-01', 'Toussaint', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000010', '2027-11-11', 'Armistice 1918', FALSE, 2027),
    ('00000000-0002-0000-0000-000000000011', '2027-12-25', 'Noël', FALSE, 2027);

-- Ajout des paramètres OT (Overtime) & ET (Extra Time) sur les régimes horaires
ALTER TABLE work_schedule_profile
    ADD COLUMN overtime_threshold_minutes INT NOT NULL DEFAULT 2100,
    ADD COLUMN overtime_rate_tier1 NUMERIC(4,2) NOT NULL DEFAULT 1.25,
    ADD COLUMN overtime_rate_tier2 NUMERIC(4,2) NOT NULL DEFAULT 1.50,
    ADD COLUMN overtime_rate_holiday NUMERIC(4,2) NOT NULL DEFAULT 2.00,
    ADD COLUMN overtime_compensation_mode VARCHAR(20) NOT NULL DEFAULT 'PAY',
    ADD COLUMN extra_time_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN extra_time_max_weekly_minutes INT NOT NULL DEFAULT 420,
    ADD COLUMN extra_time_rate NUMERIC(4,2) NOT NULL DEFAULT 1.10,
    ADD COLUMN extra_time_compensation_mode VARCHAR(20) NOT NULL DEFAULT 'PAY';

-- Personnalisation des profils existants
UPDATE work_schedule_profile
SET overtime_threshold_minutes = 2100,
    overtime_rate_tier1 = 1.25,
    overtime_rate_tier2 = 1.50,
    overtime_rate_holiday = 2.00,
    overtime_compensation_mode = 'PAY',
    extra_time_allowed = FALSE,
    extra_time_max_weekly_minutes = 0
WHERE code = 'STANDARD_35H';

UPDATE work_schedule_profile
SET overtime_threshold_minutes = 2310,
    overtime_rate_tier1 = 1.25,
    overtime_rate_tier2 = 1.50,
    overtime_rate_holiday = 2.00,
    overtime_compensation_mode = 'RECOVERY',
    extra_time_allowed = FALSE,
    extra_time_max_weekly_minutes = 0
WHERE code = 'CADRE_38H30';

UPDATE work_schedule_profile
SET overtime_threshold_minutes = 2100,
    overtime_rate_tier1 = 1.25,
    overtime_rate_tier2 = 1.50,
    overtime_rate_holiday = 2.00,
    overtime_compensation_mode = 'PAY',
    extra_time_allowed = TRUE,
    extra_time_max_weekly_minutes = 420,
    extra_time_rate = 1.10,
    extra_time_compensation_mode = 'PAY'
WHERE code = 'PART_TIME_80_WED';

UPDATE work_schedule_profile
SET overtime_threshold_minutes = 2100,
    overtime_rate_tier1 = 1.25,
    overtime_rate_tier2 = 1.50,
    overtime_rate_holiday = 2.00,
    overtime_compensation_mode = 'PAY',
    extra_time_allowed = TRUE,
    extra_time_max_weekly_minutes = 600,
    extra_time_rate = 1.25,
    extra_time_compensation_mode = 'PAY'
WHERE code = 'FLEX_ASTREINTE';
