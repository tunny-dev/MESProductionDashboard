import { fileURLToPath, URL } from 'node:url';

import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, root, '');

  const apiTarget = env.VITE_API_BASE_URL
    ? env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:5119';

  return {
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx')) return 'vendor-excel';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('@base-ui') || id.includes('lucide-react')) return 'vendor-ui';
              if (id.includes('@tanstack')) return 'vendor-tanstack';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
        '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
      },
    },
    test: {
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      passWithNoTests: true,
    },
  };
});
