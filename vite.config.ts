import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    // lets the Cloudflare quick tunnel (random *.trycloudflare.com host) reach `vite preview`
    allowedHosts: ['.trycloudflare.com'],
  },
});
