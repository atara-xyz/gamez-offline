import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, existsSync } from 'node:fs';

// Serve over HTTPS when local certs exist (run `npm run certs`). iOS only enables
// offline/PWA mode on a SECURE origin, so the iPad needs https://<lan-ip>, not http.
const https =
  existsSync('certs/cert.pem') && existsSync('certs/key.pem')
    ? { key: readFileSync('certs/key.pem'), cert: readFileSync('certs/cert.pem') }
    : undefined;

// Relative base so the built app also works when opened from a file path or any
// sub-folder (handy for copying the dist/ onto a laptop or iPad for offline use).
export default defineConfig({
  base: './',
  server: { host: true, https },
  preview: { host: true, port: 4173, strictPort: true, https },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // the useRegisterSW() hook in OfflineStatus registers it
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      workbox: {
        // Precache ONLY the small, reliable app shell: JS (all geo data is inlined
        // here), CSS, HTML, flags (svg), icons (png), fonts. This is a few MB and
        // installs atomically without choking. The ~2,200 photos are deliberately
        // EXCLUDED — a 49 MB atomic precache fails if any one file hiccups on phone
        // Wi-Fi, which breaks offline entirely. Photos are cached at runtime instead
        // (CacheFirst) and pre-fetched on demand via the "Download photos" button.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/media/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/media\//],
        runtimeCaching: [
          {
            // Animal/breed photos: serve from cache once fetched (works offline).
            urlPattern: ({ url }) => url.pathname.includes('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'geo-photos',
              expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Geo Games — offline geography',
        short_name: 'Geo Games',
        description: 'Globle/Worldle-style geography games for the family. Fully offline.',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
});
