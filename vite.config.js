import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-full.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
    workbox: { globPatterns: ['**/*.{js,mjs,css,html,png,svg}'], maximumFileSizeToCacheInBytes: 6e6 },
    manifest: { name: 'Khmer PDF Reader', short_name: 'KhmerReader', start_url: '/', display: 'standalone',
      background_color: '#ffffff', theme_color: '#4f46e5',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }
  })]
})
