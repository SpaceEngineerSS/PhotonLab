import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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
