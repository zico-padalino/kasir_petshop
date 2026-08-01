import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
    // Izinkan Cloudflare Quick Tunnel + LocalTunnel (URL berubah tiap jalan)
    allowedHosts: true,
  },
})
