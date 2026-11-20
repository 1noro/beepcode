import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app under /<repo>/; Docker and dev use / (SPEC §10.4).
const base = process.env.BASE_PATH ?? '/';

// The dark background of the provisional icon, also used by the manifest.
// TODO(7): take it from the final logo.
const brandColor = '#14161a';

export default defineConfig({
  base,
  server: {
    watch: process.env.DEV_POLLING === '1' ? { usePolling: true, interval: 300 } : null,
  },
  plugins: [
    ...(process.env.DEV_HTTPS === '1' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'beepcode',
        short_name: 'beepcode',
        description: 'Learn and practise Morse code with a single key and a tree that lights up.',
        lang: 'en',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        theme_color: brandColor,
        background_color: brandColor,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
});
