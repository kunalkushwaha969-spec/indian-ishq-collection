import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * In the Google AI Studio preview environment, HMR WebSockets are disabled
 * and Vite runs in Express middlewareMode. By default, Vite 8 still injects
 * `/@vite/client` (needed for CSS `updateStyle`/`removeStyle`) which
 * unconditionally calls `transport.connect(...)` to port 24678 and throws an
 * unhandled rejection (`Error: WebSocket closed without opened.`).
 *
 * This serve-only plugin keeps all `@vite/client` runtime exports (`updateStyle`,
 * `removeStyle`, `createHotContext`, `injectQuery`, `ErrorOverlay`) intact while
 * disabling the WebSocket connection attempt when HMR is disabled.
 */
function disableViteHmrWebsocketPlugin(): Plugin {
  return {
    name: 'disable-vite-hmr-websocket',
    apply: 'serve',
    transform(code, id) {
      if (id.includes('vite/dist/client/client.mjs')) {
        return {
          code: code
            .replace(
              'console.debug("[vite] connecting...");',
              '/* [vite] HMR WebSocket disabled in preview environment */'
            )
            .replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* HMR WebSocket connection disabled */'
            )
            .replace(
              'setupForwardConsoleHandler(transport, forwardConsole);',
              '/* forwardConsole WebSocket disabled */'
            ),
          map: null,
        };
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    // Explicitly set base path for GitHub Pages sub-directory hosting
    base: '/indian-ishq-collection/',
    plugins: [disableViteHmrWebsocketPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: false as const,
      ws: false as const,
      watch: null,
    },
  };
});
