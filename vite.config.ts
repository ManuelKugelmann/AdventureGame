import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /<repo>/
export default defineConfig({
  base: '/AdventureGame/',
  plugins: [react()],
});
