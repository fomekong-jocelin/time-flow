-- V12__time_entry_work_item_and_entry_comments.sql
-- Ajout de la granularite Work Item (Azure DevOps / tickets) et support des commentaires journaliers

ALTER TABLE time_entry
    ADD COLUMN IF NOT EXISTS work_item_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS work_item_title VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_time_entry_work_item_id ON time_entry(work_item_id);

COMMENT ON COLUMN time_entry.work_item_id IS 'Identifiant externe du ticket ou de la tache (ex. Azure DevOps work item ID)';
COMMENT ON COLUMN time_entry.work_item_title IS 'Titre du ticket ou de la tache Azure DevOps associee';
