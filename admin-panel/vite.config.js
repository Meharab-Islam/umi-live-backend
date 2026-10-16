import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, rootDir, '');
  const port = parseInt(env.ADMIN_PORT || process.env.ADMIN_PORT || '3000', 10);
  const backendPort = parseInt(env.BACKEND_PORT || process.env.BACKEND_PORT || '5050', 10);
  const backendTarget = `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    envDir: rootDir,
    server: {
      port: port,
      host: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
  };
});
