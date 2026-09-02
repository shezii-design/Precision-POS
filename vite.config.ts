// The Vite config is executed by Node, while the editor may not have the
// workspace dependencies and Node type declarations installed yet.
// @ts-ignore -- resolved by the project's package manager when Vite runs.
import tailwindcss from '@tailwindcss/vite';
// @ts-ignore -- resolved by the project's package manager when Vite runs.
import react from '@vitejs/plugin-react';
// @ts-ignore -- resolved by the project's package manager when Vite runs.
import {defineConfig} from 'vite';

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./', import.meta.url).pathname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
