-- V8 : Budget du projet (jours globaux, prix forfaitaire / montant total) et devise configurable
ALTER TABLE project ADD COLUMN IF NOT EXISTS budget_days NUMERIC(10,2);
ALTER TABLE project ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2);
ALTER TABLE project ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'EUR';
