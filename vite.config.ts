import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'], // Opcional: ajusta según tus necesidades
    })
  ],
  build: {
    outDir: 'build', // ¡Clave! Firebase busca 'build' o 'public' por defecto
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
  },
  publicDir: 'public', // Asegúrate de que los assets estáticos estén aquí
});