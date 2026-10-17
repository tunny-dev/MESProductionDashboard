import { fileURLToPath, URL } from 'node:url';

import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  // Client gọi thẳng API mới qua `VITE_API_BASE_URL` (xem src/config/api.js).
  // API bật CORS AllowAnyOrigin nên dev không cần proxy.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
