import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
// @ts-expect-error Local JS serverless handler module has no type declarations.
import githubDownloadHandler from "./api/github-download.js";
// @ts-expect-error Local JS serverless handler module has no type declarations.
import releasesHandler from "./api/releases.js";

// Serves the same serverless proxies used on Vercel during local development,
// so the `/api/*` routes work with `npm run dev` as well.
function apiProxy(): Plugin {
  return {
    name: "api-proxy",
    configureServer(server) {
      server.middlewares.use("/api/github-download", (req, res) => {
        githubDownloadHandler(req, res);
      });
      server.middlewares.use("/api/releases", (req, res) => {
        releasesHandler(req, res);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiProxy(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "favicon-96x96.png",
        "apple-touch-icon.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /\/api\/releases(\?.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-releases",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 300,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/github-download(\?.*)?$/,
            handler: "CacheFirst",
            options: {
              cacheName: "firmware-downloads",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
