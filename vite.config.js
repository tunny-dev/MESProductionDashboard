import { Buffer } from 'node:buffer';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import mesAuthHandler from './src/server/mes-auth.js';

const MAX_DEV_REQUEST_BYTES = 8_192;
const SERVER_ENV_KEYS = ['MES_AUTH_URL'];

function createNodeResponseAdapter(response) {
  return {
    status(statusCode) {
      response.statusCode = statusCode;
      return this;
    },
    setHeader(name, value) {
      response.setHeader(name, value);
      return this;
    },
    end(body = '') {
      response.end(body);
      return this;
    },
  };
}

function sendDevJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

function invokeMesAuth(request, response, body) {
  void mesAuthHandler({ method: request.method, body }, createNodeResponseAdapter(response)).catch(
    () => {
      if (!response.writableEnded) {
        sendDevJson(response, 502, { message: 'MES authentication service is unavailable' });
      }
    }
  );
}

function createMesAuthDevPlugin() {
  return {
    name: 'mes-auth-dev',
    configureServer(server) {
      server.middlewares.use('/api/mes/auth', (request, response) => {
        if (request.method !== 'POST') {
          invokeMesAuth(request, response, null);
          return;
        }

        const declaredLength = Number(request.headers['content-length']);
        if (Number.isFinite(declaredLength) && declaredLength > MAX_DEV_REQUEST_BYTES) {
          request.resume();
          sendDevJson(response, 413, { message: 'Login request is too large' });
          return;
        }

        const chunks = [];
        let totalBytes = 0;
        let tooLarge = false;

        request.on('data', (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_DEV_REQUEST_BYTES) {
            tooLarge = true;
            chunks.length = 0;
            return;
          }
          if (!tooLarge) chunks.push(chunk);
        });

        request.on('end', () => {
          if (tooLarge) {
            sendDevJson(response, 413, { message: 'Login request is too large' });
            return;
          }

          let body;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            invokeMesAuth(request, response, null);
            return;
          }
          invokeMesAuth(request, response, body);
        });

        request.on('error', () => {
          if (!response.writableEnded) {
            sendDevJson(response, 400, { message: 'Invalid login request' });
          }
        });
      });
    },
  };
}

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
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      ...(command === 'serve' ? [createMesAuthDevPlugin()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
