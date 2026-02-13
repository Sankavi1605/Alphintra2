import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Three.js into its own chunk (~700KB)
          three: ['three'],
          // Split React Three Fiber ecosystem
          'r3f': ['@react-three/fiber', '@react-three/drei'],
          // GSAP in its own chunk
          gsap: ['gsap'],
        },
      },
    },
  },
})
