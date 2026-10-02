-- V7 : Taux journaliers moyens (TJM / TH) pour la préparation de la facturation
ALTER TABLE project ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10,2);
