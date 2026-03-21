import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import compression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Gzip + Brotli for production (huge savings on GLB model files)
    compression({ algorithm: 'gzip', ext: '.gz' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    // Code-split Three.js and heavy deps into separate chunks
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', 'three-stdlib'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          physics: ['@dimforge/rapier3d-compat', '@react-three/rapier'],
          ui: ['zustand', 'wouter'],
        },
      },
    },
    // Increase warning limit since Three.js is inherently large
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    // Minify with esbuild (fastest) for dev, terser for prod if needed
    minify: 'esbuild',
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://grudgewarlords.com',
        changeOrigin: true,
      },
    },
  },
  // Optimize deps pre-bundling
  optimizeDeps: {
    include: [
      'three', '@react-three/fiber', '@react-three/drei',
      '@react-three/postprocessing', 'zustand', 'howler',
    ],
  },
});
