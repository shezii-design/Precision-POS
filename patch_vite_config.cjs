const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

const importPwa = `import { VitePWA } from 'vite-plugin-pwa';\n`;
code = code.replace(/import {defineConfig} from 'vite';/, "import {defineConfig} from 'vite';\n" + importPwa);

const oldPlugins = `plugins: [react(), tailwindcss()],`;
const newPlugins = `plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg'],
        manifest: {
          id: '/',
          name: 'Precision Parts & Automotive POS',
          short_name: 'PrecisionPOS',
          description: 'Cross-device offline & cloud inventory management with POS sales.',
          theme_color: '#b91c1c',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            }
            // Ideally we would add PNGs here, but for this preview the SVG can act as a fallback 
            // combined with the browser's ability to render the app. We can add PNGs if we generate them.
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\\/\\/fonts\\.googleapis\\.com\\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\\/\\/fonts\\.gstatic\\.com\\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],`;
code = code.replace(oldPlugins, newPlugins);

fs.writeFileSync('vite.config.ts', code);
console.log('patched vite config for PWA');
