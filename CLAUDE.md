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
        │   └── api/              # API routes Next.js (proxy al backend)
        ├── lib/                  # auth, api, pusher, socket, pdf
        ├── components/           # ErrorBanner, NotificationProvider
        └── types/
```

**Roles del sistema:** `ADMIN` | `TRAINER` | `CLIENT`

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

### Panel del Entrenador
- Dashboard con stats: clientes activos, rutinas esta semana, ejercicios completados
- Lista de clientes con nivel, objetivo y equipamiento
- Vista detallada de cliente en `/trainer/clients/[clientId]`
- Edición de datos del cliente (objetivo, experiencia, equipamiento, notas)
- Creación, edición y eliminación de rutinas
- Generación de rutinas con Claude AI (claude-opus-4-6)
- Plantillas de rutinas reutilizables
- Gestión de dietas por cliente (crear, editar, eliminar con macros)
- Plantillas de dietas
- Videos educativos (subir, eliminar, soporte Vimeo/Google Drive)
- Chat con clientes en tiempo real

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
- Historial de progreso de rutinas pasadas

### Panel de Admin
- Stats globales del sistema
- Lista de usuarios y entrenadores
- Eliminar usuarios (incluyendo entrenadores con clientes)

### Sistema Real-time
- Socket.io con Redis adapter (fallback in-memory si no hay Redis)
- Notificación al entrenador cuando un cliente completa un ejercicio
- Chat con polling de 3s como fallback si WebSocket falla
- Pusher para notificaciones push del chat
- Badge de mensajes no leídos
- Notificación toast en browser

### IA
- Generación de rutinas con Claude (`claude-opus-4-6`)
- Prompt en español adaptado al perfil del cliente
- Respeta objetivo, nivel, equipamiento, edad, peso y notas

### Seguridad
- Helmet.js (security headers)
- CORS restringido a FRONTEND_URL
- Rate limiting: 200 req/15min global, 20 req/15min en auth
- Validación con Zod en backend y frontend
- Body size limit 3MB
- bcryptjs con 10 salt rounds

### Deployment
- Railway config (`railway.json`) con healthcheck en `/api/health`
- Build command con `prisma generate` incluido
- Seed data: admin/trainer/client de prueba

---

## Mejoras implementadas recientemente (últimos commits)

1. **Duración de rutinas** — Campo `durationWeeks` con opción "Sin vencimiento"
2. **Plantillas de rutinas y dietas** — Reutilización de templates
3. **Logo/favicon HyenaHub** — PNG real reemplazó SVG placeholder
4. **Edición de rutinas** — El entrenador puede modificar sin recrear
5. **Notificaciones de mensajes** — Toast + badge + browser push
6. **Soporte Vimeo/Drive en videos** — Con fallback para videos no reproducibles
7. **Fix cookie oversized** — Solución definitiva al error Vercel 494
8. **Cold-start Neon DB** — Manejo de reconexión en primera consulta
9. **Paginación cursor-based** — Rutinas del cliente paginadas (10/página), evita O(n) en DB
10. **Logging estructurado con Pino** — Logger centralizado con child loggers por módulo, pino-pretty en dev
11. **Settings page completa** — Cambio de nombre, contraseña y avatar desde `/settings`
12. **Búsqueda y filtrado de clientes** — Barra de búsqueda + filtro por nivel en dashboard del entrenador
13. **Notificación al cliente de nueva rutina** — Cliente recibe push y toast cuando el entrenador asigna rutina (Pusher `routine.new`)
14. **Error handling en frontend** — ErrorBanner + addToast en todas las operaciones críticas (fetch, delete, mutations)
15. **Validación de URL de videos** — Valida YouTube/Vimeo/Drive/mp4 antes de guardar
16. **next.config.js con remotePatterns** — Dominios de imágenes externas habilitados para Next.js Image

---

## Lo que falta para salir a producción

### CRÍTICO — Sin esto no funciona en prod

1. **Variables de entorno en Vercel/Railway no configuradas**
   - Backend necesita: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`, `PORT`, `NODE_ENV`
   - Frontend necesita: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
   - Pusher (si se usa): `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

2. **CORS en backend** — `FRONTEND_URL` debe ser la URL real de Vercel (no localhost)

3. **Base de datos en producción** — Necesita `DATABASE_URL` apuntando a PostgreSQL en Neon/Railway/Supabase. La DB debe tener las migraciones aplicadas (`prisma migrate deploy`).

4. **JWT_SECRET seguro** — En producción debe ser un string aleatorio largo (no el placeholder del `.env.example`)

5. **NEXTAUTH_SECRET** — Debe ser distinto y seguro para producción

### IMPORTANTE — Funcionalidades incompletas o faltantes

6. **Subida de avatares** — UI implementada en `/settings` (subir por URL o base64). El avatar se muestra correctamente en el perfil pero NO se sincroniza con la sesión de NextAuth (no está en el JWT por el fix de Vercel 494). Requiere refetch del perfil para verlo actualizado.

7. **Registro de entrenadores** — No hay flujo de registro público para entrenadores. Solo el admin puede crear entrenadores manualmente o mediante seed. Esto limita el onboarding.

8. ~~**Notificaciones al cliente desde el entrenador**~~ — ✅ Implementado: cliente recibe toast + browser push cuando el entrenador asigna una rutina (Pusher `routine.new` en `NotificationProvider`).

9. **Chat — persistencia de mensajes leídos** — El badge de mensajes no leídos existe pero si el cliente cambia de pantalla el contador puede desincronizarse en ciertos escenarios de Pusher vs Socket.io.

10. ~~**Settings page**~~ — ✅ Implementada: cambio de nombre, contraseña y avatar desde `/settings`.

11. ~~**Generación de PDF**~~ — ✅ Implementado: botón de descarga PDF en rutinas y dietas para el entrenador.

12. ~~**Manejo de errores en frontend**~~ — ✅ Implementado: ErrorBanner + addToast en páginas críticas (trainer, admin, clientId, videos).

13. **Redis en producción** — Socket.io usa Redis adapter pero el fallback es in-memory. Si no hay `REDIS_URL`, múltiples instancias del backend no compartirán estado de sockets. En Railway con una sola instancia funciona; con múltiples instancias se necesita Redis real (Railway tiene el plugin).

### NICE TO HAVE — Mejoras de calidad

14. **Tests** — No hay ningún test (unitario, integración, e2e). Riesgo alto en producción sin cobertura.

15. ~~**Logging estructurado**~~ — ✅ Implementado: Pino con child loggers por módulo (`socket`, `audit`), pino-pretty en dev.

16. ~~**Paginación**~~ — ✅ Implementado: cursor-based pagination en rutinas del cliente (10/página).

17. ~~**Búsqueda de clientes**~~ — ✅ Implementado: barra de búsqueda + filtros de nivel en el dashboard del entrenador.

18. **Internacionalización** — La app está en español argentino hardcodeado. Si se quiere escalar, necesitaría i18n.

19. ~~**Validación de videos**~~ — ✅ Implementado: valida YouTube/Vimeo/Drive/mp4 en el frontend antes de guardar.

20. ~~**Carga de imágenes externas**~~ — ✅ Implementado: `remotePatterns` configurado en `next.config.js` para avatares y thumbnails.

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

# Base de datos
npm run db:push       # sync schema sin migración
npm run db:migrate    # crear migración
npm run db:studio     # UI visual de la DB
npm run db:seed       # cargar usuarios de prueba
```

---

## Endpoints del Backend (resumen)

| Grupo     | Método | Ruta                                      | Rol       |
|-----------|--------|-------------------------------------------|-----------|
| Auth      | POST   | `/api/auth/register`                      | público   |
| Auth      | POST   | `/api/auth/login`                         | público   |
| Auth      | GET    | `/api/auth/me`                            | cualquiera|
| Auth      | POST   | `/api/auth/refresh`                       | cualquiera|
| Auth      | GET    | `/api/trainers`                           | público   |
| Trainer   | GET    | `/api/trainer/dashboard`                  | TRAINER   |
| Trainer   | GET    | `/api/trainer/clients`                    | TRAINER   |
| Routines  | POST   | `/api/routines`                           | TRAINER   |
| Routines  | GET    | `/api/routines/client/:clientId`          | TRAINER   |
| Routines  | GET    | `/api/routines/my/current`               | CLIENT    |
| Routines  | PATCH  | `/api/routines/exercises/:id/complete`    | CLIENT    |
| Diets     | POST   | `/api/diets`                              | TRAINER   |
| Diets     | GET    | `/api/diets/my`                           | CLIENT    |
| Videos    | GET    | `/api/videos`                             | TRAINER   |
| Videos    | GET    | `/api/videos/trainer/:trainerId`          | CLIENT    |
| Templates | GET    | `/api/templates`                          | TRAINER   |
| Feedback  | POST   | `/api/feedback/:routineId`                | CLIENT    |
| Messages  | GET    | `/api/messages/:otherUserId`              | cualquiera|
| AI        | POST   | `/api/ai/generate-routine`                | TRAINER   |
| Admin     | GET    | `/api/admin/stats`                        | ADMIN     |
| Admin     | DELETE | `/api/admin/users/:userId`                | ADMIN     |
| Health    | GET    | `/api/health`                             | público   |
