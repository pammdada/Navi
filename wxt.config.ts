import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Navi - Accesibilidad para UTP Class',
    description: 'Asistente de accesibilidad para estudiantes de UTP Class.',
    permissions: ['storage', 'activeTab', 'scripting', 'sidePanel', 'tabs'],
    host_permissions: ['*://class.utp.edu.pe/*'],
  },
});
