# HyenaHub — Contexto del Proyecto

## ¿Qué es HyenaHub?

Plataforma web de gestión para entrenadores personales. Permite a entrenadores administrar clientes, asignar rutinas y dietas, y comunicarse en tiempo real. Los clientes pueden ver su plan, marcar ejercicios, dar feedback y chatear con su entrenador. Tiene un rol admin para gestión global.

**Stack:** Next.js 14 (frontend) + Express + Prisma (backend) + PostgreSQL  
**Deploy objetivo:** Vercel (frontend) + Railway (backend)  
**Nombre anterior:** TrainerHub (rebranding a HyenaHub completado)

---

## Arquitectura

```
hyenahub/
├── backend/          # Express + TypeScript + Prisma + Socket.io
│   ├── src/
│   │   ├── controllers/   # Lógica de negocio (10 archivos)
│   │   ├── routes/        # Definición de rutas (11 archivos)
│   │   ├── middleware/     # auth.middleware.ts, role.middleware.ts
│   │   ├── services/      # ai.service.ts, audit.service.ts, prisma.service.ts
│   │   ├── socket/        # Socket.io con Redis adapter
│   │   ├── __tests__/     # 9 archivos de test, 71 tests con Vitest
│   │   └── types/         # Interfaces TypeScript
│   └── prisma/
│       ├── schema.prisma
│       ├── seed.ts
│       └── migrations/    # 8 migraciones
└── frontend/         # Next.js 14 + NextAuth + React Query + Tailwind
    └── src/
        ├── app/
        │   ├── (auth)/           # login, register
        │   ├── (dashboard)/      # admin, trainer, client, settings
        │   └── api/              # API routes Next.js — acceden a Prisma DIRECTAMENTE
        ├── lib/                  # auth, api, pusher, socket, pdf
        ├── components/           # ErrorBanner, NotificationProvider
        └── types/
```

**Roles del sistema:** `ADMIN` | `TRAINER` | `CLIENT`

### Nota arquitectural importante
Las rutas `/api/` de Next.js **no son proxies al backend Express** — acceden a Prisma directamente. Son dos implementaciones paralelas sobre la misma DB. Express es útil para API mobile/externa futura; el frontend web es completamente autónomo.

---

## Qué está implementado y funcionando

### Autenticación
- Registro con rol y asignación de entrenador para clientes
- Login con JWT (access token 1h + refresh token 30 días)
- NextAuth Credentials provider en frontend
- Middleware Next.js que protege rutas por rol (`/admin`, `/trainer`, `/client`)
- Auto-limpieza de cookies oversized >4KB (fix para Vercel 494)
- Refresh token persistido en DB con TTL de 30 días
- Reset de contraseña de cliente por parte del entrenador
- Validación de contraseña: mín. 8 chars + mayúscula + número (alineada entre frontend y backend)

### Panel del Entrenador
- Dashboard con stats: clientes activos, rutinas esta semana, ejercicios completados
- Lista de clientes con nivel, objetivo y equipamiento + búsqueda y filtro por nivel
- Vista detallada de cliente en `/trainer/clients/[clientId]`
- Edición de datos del cliente (objetivo, experiencia, equipamiento, notas)
- Creación, edición y eliminación de rutinas (con campo `durationWeeks`)
- Generación de rutinas con Claude AI (claude-opus-4-6)
- Plantillas de rutinas y dietas reutilizables
- Gestión de dietas por cliente (crear, editar, eliminar con macros)
- Videos educativos (subir, eliminar, soporte Vimeo/Google Drive)
- Chat con clientes en tiempo real
- Descarga de rutinas/dietas como PDF

### Panel del Cliente
- Dashboard con rutina actual y progreso semanal
- Marcar ejercicios como completados
- Agregar notas personales a ejercicios
- Ver feedback de su entrenador
- Dejar feedback semanal (rating + comentario)
- Ver plan de dieta asignado con detalles de comidas
- Ver videos del entrenador
- Ver perfil del entrenador asignado
- Chat con el entrenador
- Historial de progreso de rutinas pasadas (cursor-based pagination)

### Panel de Admin
- Stats globales del sistema
- Lista de usuarios y entrenadores
- Eliminar usuarios (incluyendo entrenadores con clientes)

### Sistema Real-time
- Socket.io con Redis adapter (fallback in-memory si no hay Redis)
- Notificación al entrenador cuando un cliente completa un ejercicio
- Chat con polling de 3s como fallback **solo cuando Pusher no está conectado**
- Pusher para notificaciones push del chat
- Badge de mensajes no leídos (sincronizado por sender ID, no por pathname)
- Notificación toast en browser
- Notificación al cliente cuando el entrenador asigna una rutina nueva

### IA
- Generación de rutinas con Claude (`claude-opus-4-6`)
- Prompt en español adaptado al perfil del cliente
- Respeta objetivo, nivel, equipamiento, edad, peso y notas

### Seguridad
- Helmet.js (security headers)
- CORS restringido a FRONTEND_URL
- Rate limiting: 200 req/15min global, 20 req/15min en auth
- Validación con Zod en backend y frontend (reglas idénticas)
- Body size limit 3MB
- bcryptjs con 10 salt rounds
- Logs de auditoría via Pino a stdout (Railway los captura)

### Deployment
- Railway config (`railway.json`) con healthcheck en `/api/health`
- Build command con `prisma generate` incluido
- Seed data: admin/trainer/client de prueba

### Tests (backend)
- **71 tests** con Vitest + Supertest en 9 archivos
- Cobertura: health, auth, middleware, routines, trainer, diets, admin, messages, feedback/profile
- Setup: `backend/vitest.config.ts` + `backend/src/__tests__/setup.ts`
- Ejecutar: `cd backend && npx vitest run`

---

## Mejoras implementadas (historial de commits recientes)

1. **Duración de rutinas** — Campo `durationWeeks` con opción "Sin vencimiento"
2. **Plantillas de rutinas y dietas** — Reutilización de templates
3. **Logo/favicon HyenaHub** — PNG real reemplazó SVG placeholder
4. **Edición de rutinas** — El entrenador puede modificar sin recrear
5. **Notificaciones de mensajes** — Toast + badge + browser push
6. **Soporte Vimeo/Drive en videos** — Con fallback para videos no reproducibles
7. **Fix cookie oversized** — Solución definitiva al error Vercel 494
8. **Cold-start Neon DB** — Manejo de reconexión en primera consulta
9. **Paginación cursor-based** — Rutinas del cliente paginadas (10/página), evita O(n) en DB
10. **Logging estructurado con Pino** — Logger centralizado con child loggers por módulo
11. **Settings page completa** — Cambio de nombre, contraseña y avatar desde `/settings`
12. **Búsqueda y filtrado de clientes** — Barra de búsqueda + filtro por nivel en dashboard del entrenador
13. **Notificación al cliente de nueva rutina** — Cliente recibe push y toast cuando el entrenador asigna rutina
14. **Error handling en frontend** — ErrorBanner + addToast en todas las operaciones críticas
15. **Validación de URL de videos** — Valida YouTube/Vimeo/Drive/mp4 antes de guardar
16. **next.config.js con remotePatterns** — Dominios de imágenes externas habilitados para Next.js Image
17. **Suite de tests backend** — 71 tests con Vitest + Supertest (9 archivos)
18. **Fix badge mensajes (chat)** — Sincronizado por sender ID con `activeChatUserIdRef`; `refreshUnreadCount` en vez de limpiar localmente
19. **Validación contraseña alineada** — Backend exige min 8 + mayúscula + número (igual que frontend)
20. **Audit log efímero eliminado** — `fs.appendFile` removido; Pino stdout es suficiente para Railway
21. **Polling chat condicional** — El polling de 3s se omite cuando Pusher está conectado
22. **`durationWeeks` en Express** — Agregado al schema Zod y propagado a `prisma.routine.create`
23. **Avatar sincroniza con NextAuth** — `updateSession({ avatar })` al guardar; avatar URL se propaga al JWT y al nav inmediatamente

---

## Lo que falta para salir a producción

### CRÍTICO — Sin esto no funciona en prod

1. **Variables de entorno en Vercel/Railway no configuradas**
   - Backend necesita: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`, `PORT`, `NODE_ENV`
   - Frontend necesita: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
   - Pusher: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

2. **CORS en backend** — `FRONTEND_URL` debe ser la URL real de Vercel (no localhost)

3. **Base de datos en producción** — `DATABASE_URL` apuntando a PostgreSQL en Neon/Railway/Supabase + `prisma migrate deploy`

4. **JWT_SECRET y NEXTAUTH_SECRET seguros** — Strings aleatorios largos, distintos entre sí

### IMPORTANTE — Funcionalidades incompletas

5. **Avatar base64 no sincroniza al nav** — Limitación conocida: si el usuario sube una foto desde archivo (base64), el nav muestra la inicial en vez del avatar (base64 inflaría la cookie >4KB, Vercel 494). Avatar por URL sí sincroniza. Solución posible: guardar avatares en Cloudinary/S3 y almacenar solo la URL.

6. **Redis en producción** — Socket.io usa Redis adapter pero el fallback es in-memory. Con una sola instancia Railway funciona; con múltiples instancias se necesita `REDIS_URL` (Railway tiene el plugin).

7. **Express incompleto vs. Next.js** — Si en el futuro se quiere una API pública o mobile, Express le faltan: `PATCH /profile/name`, `POST /profile/change-password`, `POST /trainer/clients/:id/reset-password`, `POST /messages` (enviar mensaje), `GET|POST /diet-templates`, `PATCH /routines/:id`. Para el frontend web esto no importa (usa rutas Next.js directamente).

### NICE TO HAVE

8. **Internacionalización** — La app está en español argentino hardcodeado. Si se quiere escalar, necesitaría i18n.

9. **Tests e2e / frontend** — Los tests actuales son solo backend. No hay tests de componentes React ni e2e con Playwright/Cypress.

10. **Subida real de avatares** — La foto subida desde archivo se convierte a base64 y se guarda en la DB (hasta 2MB). Para producción sería mejor guardar en Cloudinary/S3 y almacenar solo la URL — resolvería también el problema de sincronización al nav.

---

## Variables de entorno requeridas

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="[string largo y aleatorio]"
JWT_EXPIRES_IN="1h"
ANTHROPIC_API_KEY="sk-ant-..."
PORT=4000
FRONTEND_URL="https://tu-app.vercel.app"
NODE_ENV="production"
REDIS_URL="redis://..."   # opcional pero recomendado en prod
```

### Frontend (`frontend/.env.local`)
```env
NEXTAUTH_URL="https://tu-app.vercel.app"
NEXTAUTH_SECRET="[string largo y aleatorio]"
NEXT_PUBLIC_API_URL="https://tu-backend.railway.app/api"
NEXT_PUBLIC_SOCKET_URL="https://tu-backend.railway.app"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="..."
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
```

---

## Usuarios de prueba (seed)

```
Admin:   admin@trainerhub.com   / admin123
Trainer: trainer@trainerhub.com / trainer123
Client:  client@trainerhub.com  / client123
```

---

## Comandos útiles

```bash
# Desarrollo completo (backend + frontend)
npm run dev

# Solo backend
npm run dev --workspace=backend

# Solo frontend
npm run dev --workspace=frontend

# Tests backend
cd backend && npx vitest run          # todos los tests
cd backend && npx vitest run --watch  # modo watch

# Base de datos
npm run db:push       # sync schema sin migración
npm run db:migrate    # crear migración
npm run db:studio     # UI visual de la DB
npm run db:seed       # cargar usuarios de prueba
```

---

## Endpoints del Backend Express (resumen)

> El frontend web usa las rutas Next.js en `/api/`, no estas. Estas son para acceso externo/API pública.

| Grupo     | Método | Ruta                                      | Rol       |
|-----------|--------|-------------------------------------------|-----------|
| Auth      | POST   | `/api/auth/register`                      | público   |
| Auth      | POST   | `/api/auth/login`                         | público   |
| Auth      | GET    | `/api/auth/me`                            | cualquiera|
| Auth      | POST   | `/api/auth/refresh`                       | cualquiera|
| Auth      | POST   | `/api/auth/logout`                        | cualquiera|
| Auth      | GET    | `/api/auth/trainers`                      | público   |
| Trainer   | GET    | `/api/trainer/dashboard`                  | TRAINER   |
| Trainer   | GET    | `/api/trainer/clients`                    | TRAINER   |
| Trainer   | GET    | `/api/trainer/clients/:clientId`          | TRAINER   |
| Trainer   | PATCH  | `/api/trainer/clients/:clientId`          | TRAINER   |
| Routines  | POST   | `/api/routines`                           | TRAINER   |
| Routines  | DELETE | `/api/routines/:routineId`                | TRAINER   |
| Routines  | GET    | `/api/routines/client/:clientId`          | TRAINER   |
| Routines  | GET    | `/api/routines/my/current`                | CLIENT    |
| Routines  | GET    | `/api/routines/my/progress`               | CLIENT    |
| Routines  | GET    | `/api/routines`                           | CLIENT    |
| Routines  | PATCH  | `/api/routines/exercises/:id/complete`    | CLIENT    |
| Routines  | PATCH  | `/api/routines/exercises/:id/note`        | CLIENT    |
| Diets     | POST   | `/api/diets`                              | TRAINER   |
| Diets     | PUT    | `/api/diets/:dietId`                      | TRAINER   |
| Diets     | DELETE | `/api/diets/:dietId`                      | TRAINER   |
| Diets     | GET    | `/api/diets/client/:clientId`             | TRAINER   |
| Diets     | GET    | `/api/diets`                              | CLIENT    |
| Videos    | GET    | `/api/videos`                             | TRAINER   |
| Videos    | POST   | `/api/videos`                             | TRAINER   |
| Videos    | DELETE | `/api/videos/:videoId`                    | TRAINER   |
| Videos    | GET    | `/api/videos/trainer/:trainerId`          | CLIENT    |
| Templates | GET    | `/api/templates`                          | TRAINER   |
| Templates | POST   | `/api/templates`                          | TRAINER   |
| Templates | DELETE | `/api/templates/:templateId`              | TRAINER   |
| Feedback  | POST   | `/api/feedback/:routineId`                | CLIENT    |
| Feedback  | GET    | `/api/feedback/routine/:routineId`        | TRAINER   |
| Messages  | GET    | `/api/messages/unread-count`              | cualquiera|
| Messages  | GET    | `/api/messages/:otherUserId`              | cualquiera|
| Profile   | GET    | `/api/profile/me`                         | cualquiera|
| Profile   | PATCH  | `/api/profile/avatar`                     | cualquiera|
| Profile   | GET    | `/api/profile/my-trainer`                 | CLIENT    |
| AI        | POST   | `/api/ai/generate-routine`                | TRAINER   |
| Admin     | GET    | `/api/admin/stats`                        | ADMIN     |
| Admin     | GET    | `/api/admin/users`                        | ADMIN     |
| Admin     | DELETE | `/api/admin/users/:userId`                | ADMIN     |
| Admin     | GET    | `/api/admin/trainers`                     | ADMIN     |
| Health    | GET    | `/api/health`                             | público   |
