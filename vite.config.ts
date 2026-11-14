import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const JOUR = 24 * 60 * 60

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Tabi · carnet de voyage au Japon',
        short_name: 'Tabi',
        description: 'Ton carnet de voyage au Japon : lieux, notes, prix et carte.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F4F1',
        theme_color: '#F4F4F1',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // L'app entière (dont le moteur de carte) est gardée sur l'appareil : elle s'ouvre sans réseau.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Données Supabase (lecture) : réseau d'abord, sinon la dernière version vue
            urlPattern: ({ url, request }) => request.method === 'GET' && url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'japon-donnees',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * JOUR },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Fonds de carte OpenFreeMap (styles, tuiles, polices) : gardés 30 jours
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'japon-carte',
              expiration: { maxEntries: 3000, maxAgeSeconds: 30 * JOUR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Polices Google
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'japon-polices', expiration: { maxEntries: 30, maxAgeSeconds: 365 * JOUR } },
          },
          {
            // Photos Unsplash de secours
            urlPattern: ({ url }) => url.hostname === 'images.unsplash.com',
            handler: 'CacheFirst',
            options: { cacheName: 'japon-unsplash', expiration: { maxEntries: 60, maxAgeSeconds: 30 * JOUR }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Taux de change
            urlPattern: ({ url }) => url.hostname === 'api.frankfurter.dev',
            handler: 'NetworkFirst',
            options: { cacheName: 'japon-taux', networkTimeoutSeconds: 4, expiration: { maxEntries: 200, maxAgeSeconds: 365 * JOUR } },
          },
        ],
      },
    }),
  ],
})
