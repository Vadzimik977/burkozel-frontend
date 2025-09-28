import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import nodePolyfills from 'vite-plugin-node-stdlib-browser';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), nodePolyfills()],
    base: '/frontend/', 
    build: {
      outDir: '../build',
      emptyOutDir: true,
    },
    define: {
      'process.env.VITE_BACKEND': JSON.stringify(env.VITE_BACKEND_URL),
    },
    server: {
      host: '0.0.0.0', 
      port: 5173,
      allowedHosts: [
        'localhost',
        'playmost.ru',
        'toniumworld.com',
      ],
      // hmr: {
      //   protocol: 'wss',
      //   host: 'toniumworld.com',
      //   port: 443,
      // },
    },
  };
});
