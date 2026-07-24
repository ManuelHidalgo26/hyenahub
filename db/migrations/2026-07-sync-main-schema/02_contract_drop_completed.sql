-- ============================================================================
-- HyenaHub · Migración a schema de origin/main  ·  FASE 2: CONTRACT
-- ----------------------------------------------------------------------------
-- Elimina la columna exercises.completed, que ya fue portada a exercise_logs
-- en la fase 1. Es DESTRUCTIVA: corré esto SOLO después de confirmar que main
-- está deployado y andando bien (el código nuevo ya no usa completed).
--
-- Antes de correr, verificá que el backfill quedó bien:
--   SELECT count(*) FROM exercises WHERE completed = true;  -- N
--   SELECT count(*) FROM exercise_logs;                     -- debe ser >= N
-- ============================================================================

BEGIN;

ALTER TABLE "exercises" DROP COLUMN IF EXISTS "completed";

COMMIT;
