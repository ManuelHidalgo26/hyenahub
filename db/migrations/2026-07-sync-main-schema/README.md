# Migración: sincronizar la DB de producción con el schema de `main`

## Por qué

La base de producción (Neon) quedó en el **schema viejo**, mientras que `origin/main`
ya tiene la re-arquitectura que espera el **schema nuevo**. Diferencias:

| Falta en la DB | Sobra en la DB | Ya aplicado |
|---|---|---|
| tablas `routine_days`, `exercise_logs` | `exercises.completed` (portar y borrar) | `exercises.clientWeight` |
| columnas `exercises.dayId`, `routines.hidden` | | `routine_templates.durationWeeks` |

El código de `main` **no corre** contra la DB actual hasta aplicar esto.

## Orden de aplicación (expand / contract — sin downtime)

La migración está partida en dos para no romper el código viejo mientras deployás:

```
1. Backup / branch de Neon
2. Aplicar 01_expand_and_backfill.sql   (aditivo: crea tablas/columnas + porta completed → exercise_logs)
3. Deployar main
4. Verificar que la app anda (marcar/desmarcar ejercicios, ver progreso)
5. Aplicar 02_contract_drop_completed.sql  (borra exercises.completed, ya portado)
```

El paso 2 es 100% aditivo: la columna `completed` sigue ahí, así que el código
viejo que está deployado en ese momento sigue funcionando. El `DROP` recién ocurre
en el paso 5, cuando `main` ya está andando y nadie usa `completed`.

## Backup primero

En Neon, creá un **branch** del proyecto (o confirmá que tenés PITR activo) antes
de tocar nada. Es tu punto de retorno si algo sale mal.

## Cómo aplicar

Con `DATABASE_URL` apuntando a producción. Opción A (psql):

```bash
psql "$DATABASE_URL" -f db/migrations/2026-07-sync-main-schema/01_expand_and_backfill.sql
```

Opción B (Prisma, sin psql instalado):

```bash
npx prisma db execute --file db/migrations/2026-07-sync-main-schema/01_expand_and_backfill.sql --schema frontend/prisma/schema.prisma
```

Verificá el resultado (esperados comentados en el archivo):

```bash
psql "$DATABASE_URL" -f db/migrations/2026-07-sync-main-schema/03_verify.sql
```

Luego de deployar `main` y confirmar que anda, corré la fase 2 igual que la 1
pero con `02_contract_drop_completed.sql`.

## Notas

- Ambas fases corren dentro de una transacción: si algo falla, no queda nada a medias.
- Los scripts son **idempotentes** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`): re-correrlos no rompe.
- El backfill portó **6** ejercicios `completed` a `exercise_logs` (validado read-only), con `weekOf = lunes` de cada semana — coincide con `getMondayOf()` del código.
- **Nunca** `prisma db push --accept-data-loss` sobre esta base: borraría `completed` sin portar los datos. Usá estos scripts.
