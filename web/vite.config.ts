import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'PhotonLab FDTD',
        short_name: 'PhotonLab',
        description: 'Real-time Electromagnetic Simulation in your browser',
        theme_color: '#0a0b10',
        background_color: '#0a0b10',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Cache Wasm files specifically for offline physics
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 5000000 // Increase limit for Wasm
      }
    })
  ],

  // Allow Vite to serve files from the rust-core package
  server: {
    fs: {
      // Allow serving files from the parent directory (for Wasm package)
      allow: [
        // Project root
        '.',
        // Rust core Wasm package
        path.resolve(__dirname, '../rust-core/pkg'),
      ],
    },
  },

  // Optimize Wasm loading
  optimizeDeps: {
    exclude: ['photonlab-core'],
  },
})
