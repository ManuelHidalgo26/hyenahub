/**
 * Push Notifications — ESTRUCTURA BASE (desactivada)
 *
 * Estado: comentado/desactivado intencionalmente.
 * Activar cuando el backend Express tenga listo el endpoint:
 *   POST /api/v1/push/subscribe
 *
 * ─── Variables de entorno necesarias ────────────────────────────────────────
 *
 * En .env.local (frontend):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<tu_clave_pública_VAPID>
 *
 * En el backend Express (.env):
 *   VAPID_PUBLIC_KEY=<tu_clave_pública_VAPID>
 *   VAPID_PRIVATE_KEY=<tu_clave_privada_VAPID>
 *   VAPID_MAILTO=mailto:soporte@hyenahub.com
 *
 * ─── Generar claves VAPID ───────────────────────────────────────────────────
 *
 * Opción 1 — web-push CLI:
 *   npx web-push generate-vapid-keys
 *
 * Opción 2 — Node.js:
 *   const webPush = require('web-push');
 *   const keys = webPush.generateVAPIDKeys();
 *   console.log(keys.publicKey, keys.privateKey);
 *
 * ─── Activación ─────────────────────────────────────────────────────────────
 *
 * 1. Generar claves VAPID con el comando de arriba
 * 2. Agregar las variables de entorno en Vercel + Railway
 * 3. Implementar en Express:
 *      POST /api/v1/push/subscribe  → guarda la suscripción en la DB
 *      POST /api/v1/push/send       → envía notificación a un user
 * 4. Descomentar el código de abajo y llamar a subscribeToPush()
 *    desde el componente de settings del usuario
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

// import { urlBase64ToUint8Array } from './utils'; // helper abajo

// /**
//  * Suscribe al usuario a push notifications.
//  * Llama a este función después de que el usuario dé permiso explícito.
//  */
// export async function subscribeToPush(userId: string): Promise<void> {
//   if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
//     console.warn('[PWA] Push notifications no soportadas en este browser');
//     return;
//   }
//
//   const permission = await Notification.requestPermission();
//   if (permission !== 'granted') {
//     console.info('[PWA] Permiso de notificaciones denegado');
//     return;
//   }
//
//   const registration = await navigator.serviceWorker.ready;
//   const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
//
//   if (!vapidPublicKey) {
//     console.error('[PWA] NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada');
//     return;
//   }
//
//   const subscription = await registration.pushManager.subscribe({
//     userVisibleOnly: true,
//     applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
//   });
//
//   // Enviar la suscripción al backend Express
//   await fetch('/api/push/subscribe', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ userId, subscription }),
//   });
//
//   console.info('[PWA] Suscripción a push notifications registrada');
// }
//
// /**
//  * Cancela la suscripción del usuario a push notifications.
//  */
// export async function unsubscribeFromPush(): Promise<void> {
//   if (!('serviceWorker' in navigator)) return;
//
//   const registration = await navigator.serviceWorker.ready;
//   const subscription = await registration.pushManager.getSubscription();
//
//   if (subscription) {
//     await subscription.unsubscribe();
//     // Opcional: notificar al backend que se eliminó la suscripción
//     await fetch('/api/push/subscribe', { method: 'DELETE' });
//   }
// }
//
// /** Convierte una clave VAPID base64url a Uint8Array para el browser */
// function urlBase64ToUint8Array(base64String: string): Uint8Array {
//   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
//   const rawData = window.atob(base64);
//   return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
// }

export {};
