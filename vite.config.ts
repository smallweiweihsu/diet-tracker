import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/diet-tracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon-*.png'],
      manifest: {
        name: '飲食記錄',
        short_name: 'DietTrack',
        description: '個人飲食與體重追蹤',
        theme_color: '#d8ceb8',
        background_color: '#f8f3e6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/diet-tracker/',
        scope: '/diet-tracker/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
