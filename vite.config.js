import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl()],
  server: {
    host: true, // Cho phép truy cập từ mạng LAN
  }
})
