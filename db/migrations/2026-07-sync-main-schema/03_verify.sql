-- ============================================================================
-- HyenaHub · Verificación de la migración a schema de origin/main
-- ----------------------------------------------------------------------------
-- Correr DESPUÉS de la fase 1 (y de nuevo después de la fase 2).
-- Cada consulta indica el resultado esperado en un comentario.
-- ============================================================================

-- Tablas nuevas: deben existir las 2.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('routine_days', 'exercise_logs')
ORDER BY table_name;                       -- esperado: exercise_logs, routine_days

-- Columnas nuevas: deben aparecer las 3.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ( (table_name = 'exercises' AND column_name IN ('dayId', 'clientWeight'))
     OR (table_name = 'routines'  AND column_name = 'hidden') )
ORDER BY table_name, column_name;          -- esperado: exercises/clientWeight, exercises/dayId, routines/hidden

-- Backfill: la cantidad de logs debe ser >= la de completed portados.
SELECT
  (SELECT count(*) FROM exercise_logs)                          AS logs,
  (SELECT count(*) FROM exercises WHERE completed = true)       AS completed_true;
-- Tras FASE 1: logs = 6, completed_true = 6.
-- Tras FASE 2: la columna completed ya no existe, así que la 2da subconsulta
--              dará error "column does not exist" -> es lo esperado.

-- FKs creadas correctamente (deben aparecer las 3).
SELECT conname
FROM pg_constraint
WHERE conname IN ('routine_days_routineId_fkey',
                  'exercise_logs_exerciseId_fkey',
                  'exercise_logs_clientId_fkey',
                  'exercises_dayId_fkey')
ORDER BY conname;
