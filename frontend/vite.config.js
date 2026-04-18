import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@games': path.resolve(__dirname, '../games'),
    },
  },
  server: {
    fs: {
      allow: ['..'], // allow access outside frontend
    },
  },
});