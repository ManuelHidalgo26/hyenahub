-- ============================================================================
-- HyenaHub · Migración a schema de origin/main  ·  FASE 1: EXPAND + BACKFILL
-- ----------------------------------------------------------------------------
-- Sincroniza la DB de producción (schema viejo) con el schema nuevo de main:
--   · crea las tablas routine_days y exercise_logs
--   · agrega exercises.dayId, routines.hidden, exercises.clientWeight
--   · porta el estado viejo exercises.completed -> exercise_logs (por semana)
--
-- Es 100% ADITIVO e IDEMPOTENTE: NO borra nada. La columna exercises.completed
-- se conserva, así que el código VIEJO que hoy está deployado sigue funcionando.
-- Corré esta fase ANTES (o justo antes) de deployar main. El DROP de completed
-- va en la fase 2, DESPUÉS de confirmar que main está andando.
--
-- Requisitos: Postgres 13+ (usa gen_random_uuid(), nativa en Neon).
-- Todo corre dentro de una transacción: si algo falla, no queda nada a medias.
-- ============================================================================

BEGIN;

-- 1. routine_days ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "routine_days" (
  "id"        TEXT    NOT NULL,
  "routineId" TEXT    NOT NULL,
  "name"      TEXT    NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "routine_days_routineId_idx" ON "routine_days"("routineId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'routine_days_routineId_fkey') THEN
    ALTER TABLE "routine_days"
      ADD CONSTRAINT "routine_days_routineId_fkey"
      FOREIGN KEY ("routineId") REFERENCES "routines"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. exercise_logs (tracking de "realizado" por semana) ----------------------
CREATE TABLE IF NOT EXISTS "exercise_logs" (
  "id"         TEXT         NOT NULL,
  "exerciseId" TEXT         NOT NULL,
  "clientId"   TEXT         NOT NULL,
  "weekOf"     TIMESTAMP(3) NOT NULL,
  "loggedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exercise_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "exercise_logs_exerciseId_clientId_weekOf_key"
  ON "exercise_logs"("exerciseId", "clientId", "weekOf");
CREATE INDEX IF NOT EXISTS "exercise_logs_clientId_weekOf_idx"
  ON "exercise_logs"("clientId", "weekOf");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercise_logs_exerciseId_fkey') THEN
    ALTER TABLE "exercise_logs"
      ADD CONSTRAINT "exercise_logs_exerciseId_fkey"
      FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercise_logs_clientId_fkey') THEN
    ALTER TABLE "exercise_logs"
      ADD CONSTRAINT "exercise_logs_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. exercises.dayId (FK opcional a routine_days) ----------------------------
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "dayId" TEXT;
CREATE INDEX IF NOT EXISTS "exercises_dayId_idx" ON "exercises"("dayId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercises_dayId_fkey') THEN
    ALTER TABLE "exercises"
      ADD CONSTRAINT "exercises_dayId_fkey"
      FOREIGN KEY ("dayId") REFERENCES "routine_days"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. routines.hidden (archivar rutinas) --------------------------------------
ALTER TABLE "routines" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;

-- 5. exercises.clientWeight (feature de pesos; ya aplicada, por idempotencia) -
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "clientWeight" DOUBLE PRECISION;

-- 6. BACKFILL: portar completed=true -> exercise_logs ------------------------
--    weekOf = lunes de la semana de la rutina (equivale a getMondayOf(weekStart)
--    del código; date_trunc('week', ...) en Postgres también devuelve el lunes).
INSERT INTO "exercise_logs" ("id", "exerciseId", "clientId", "weekOf", "loggedAt")
SELECT gen_random_uuid()::text,
       e."id",
       r."clientId",
       date_trunc('week', r."weekStart")::timestamp(3),
       CURRENT_TIMESTAMP
FROM "exercises" e
JOIN "routines"  r ON r."id" = e."routineId"
WHERE e."completed" = true
ON CONFLICT ("exerciseId", "clientId", "weekOf") DO NOTHING;

COMMIT;

-- Verificación rápida (correr aparte, fuera de la transacción):
--   SELECT count(*) FROM exercise_logs;                    -- esperado: ~6
--   SELECT count(*) FROM exercises WHERE completed = true; -- esperado: 6 (aún intacto)
