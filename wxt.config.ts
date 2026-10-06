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
    // Sin popup: al pulsar el ícono se abre el panel lateral (ver background.ts).
    action: { default_title: 'Abrir Navi' },
    permissions: ['storage', 'activeTab', 'scripting', 'sidePanel', 'tabs'],
    host_permissions: ['*://class.utp.edu.pe/*'],
    // Solo para el resumen con IA opcional: Navi pide permiso para UN servidor concreto, con un clic del usuario.
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  },
});
