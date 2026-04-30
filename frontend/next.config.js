/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default;

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
};

const pwaConfig = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    // Limpia caches de versiones anteriores al activar el SW
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      // NetworkFirst para todas las llamadas a /api/
      {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'hyenahub-api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 horas
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // CacheFirst para imágenes y assets estáticos
      {
        urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|ico|bmp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'hyenahub-images-cache',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // CacheFirst para JS/CSS compilados y fuentes
      {
        urlPattern: /\.(?:js|css|woff|woff2|ttf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'hyenahub-static-cache',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // StaleWhileRevalidate para páginas de la app (excluye /api/)
      {
        urlPattern: /^\/(?!api\/).*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'hyenahub-pages-cache',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
};

module.exports = withPWA(pwaConfig)(nextConfig);
