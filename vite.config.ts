import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Relax only the HTML served by Vite; the source and production CSP stay strict. */
function developmentCsp(): Plugin {
  return {
    name: "recruitdesk-development-csp",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        if (!context.server) return html;
        const port = context.server.config.server.port ?? 5173;
        return html
          .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
          .replace(
            "connect-src 'none';",
            `connect-src 'self' ws://127.0.0.1:${port} ws://localhost:${port};`,
          )
          .replace("worker-src 'self';", "worker-src 'none';");
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), developmentCsp()],
  base: "./",
  build: { sourcemap: false },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  },
});
