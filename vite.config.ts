import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('react-router-dom') ||
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }
          if (id.includes('zustand')) return 'state-vendor';
          if (id.includes('framer-motion')) return 'animation-vendor';
          if (id.includes('@tanstack/react-virtual')) return 'virtual-vendor';
          return undefined;
        },
      },
    },
  },
});
