import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const SERVER_ENV_KEYS = ['MES_PROXY_TARGET'];
const DEFAULT_MES_PROXY_TARGET = 'http://10.1.200.31';

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, root, '');

  if (command === 'serve') {
    for (const key of SERVER_ENV_KEYS) {
      if (!process.env[key] && env[key]) process.env[key] = env[key];
    }
  }

  return {
    server: {
      proxy: {
        '/MES': {
          target: env.MES_PROXY_TARGET || DEFAULT_MES_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
