import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

const hmrSilencerPlugin: Plugin = {
  name: 'silence-hmr-websocket',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          children: `
            (function() {
              window.addEventListener('unhandledrejection', function(event) {
                var reason = event && event.reason;
                var msg = (reason && (reason.message || reason.stack || String(reason))) || '';
                if (typeof msg === 'string' && (msg.indexOf('WebSocket') !== -1 || msg.indexOf('closed without opened') !== -1)) {
                  event.preventDefault();
                  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                }
              }, true);

              window.addEventListener('error', function(event) {
                var msg = (event && (event.message || '')) || '';
                if (typeof msg === 'string' && (msg.indexOf('WebSocket') !== -1 || msg.indexOf('closed without opened') !== -1)) {
                  event.preventDefault();
                  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                }
              }, true);

              var NativeWS = window.WebSocket;
              if (NativeWS) {
                window.WebSocket = function(url, protocols) {
                  var isHmr = protocols === 'vite-hmr' || (typeof url === 'string' && (url.indexOf('vite-hmr') !== -1 || url.indexOf('24678') !== -1));
                  if (isHmr) {
                    var dummy = new EventTarget();
                    dummy.readyState = 1;
                    dummy.send = function() {};
                    dummy.close = function() {};
                    setTimeout(function() {
                      dummy.dispatchEvent(new Event('open'));
                    }, 0);
                    return dummy;
                  }
                  return new NativeWS(url, protocols);
                };
                window.WebSocket.prototype = NativeWS.prototype;
                window.WebSocket.CONNECTING = 0;
                window.WebSocket.OPEN = 1;
                window.WebSocket.CLOSING = 2;
                window.WebSocket.CLOSED = 3;
              }
            })();
          `,
        },
      ];
    },
  },
};

export default defineConfig(({ command }) => {
  return {
    // In production build (e.g. GitHub Pages), use repository subpath or custom domain base. In dev, serve from root.
    base: command === 'build' ? (process.env.VITE_BASE || '/indian-ishq-collection/') : '/',
    plugins: [hmrSilencerPlugin, react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
