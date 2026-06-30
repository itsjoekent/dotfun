import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  base: '/guess-off/',
  build: {
    outDir: 'dist/guess-off',
  },
  server: { host: '0.0.0.0' },
  plugins: [react(), cloudflare()],
})