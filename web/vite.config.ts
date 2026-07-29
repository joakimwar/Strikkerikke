import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works from any subdirectory
  // (GitHub Pages project sites, /ustastrikk/, a plain file server …).
  // Safe because routing is hash-based and never touches the path.
  base: './',
})
