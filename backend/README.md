# HyenaHub — Servidor Express (infraestructura)

## Rol de este servidor

Este servidor Express **NO** maneja el CRUD de la aplicación. Ese rol pertenece
exclusivamente a las API routes de Next.js en `frontend/src/app/api/`.

Este servidor existe para tareas que Next.js no maneja bien:

| Responsabilidad | Ruta base |
|---|---|
| Generación de rutinas con Claude Opus (IA de alta calidad) | `POST /api/ai/generate-routine` |
| Jobs programados y tareas en segundo plano | `POST /api/jobs/*` |
| Webhooks de servicios externos (pagos, etc.) | `POST /api/webhooks/*` |
| Sincronización offline para PWA (Fase 6) | `POST /api/sync/*` (pendiente) |

## Schema Prisma

`prisma/schema.prisma` es un **symlink** que apunta a `frontend/prisma/schema.prisma`.

**Fuente de verdad única:** `frontend/prisma/schema.prisma`

- Las migraciones se corren **solo** desde `frontend/` con `npx prisma migrate dev`
- Este servidor solo ejecuta `prisma generate` al buildear, nunca corre migraciones

## Desarrollo

```bash
npm install
npm run dev       # ts-node-dev con hot reload
```

## Build

```bash
npm run build     # prisma generate + tsc
npm start         # corre el JS compilado desde dist/
```

## Variables de entorno requeridas

- `DATABASE_URL` — PostgreSQL (mismo que frontend)
- `JWT_SECRET` — para validar tokens en endpoints de AI
- `ANTHROPIC_API_KEY` — Claude API para generación de rutinas
- `FRONTEND_URL` — origen del frontend (CORS), default `http://localhost:3000`
- `PORT` — puerto del servidor, default `4000`
