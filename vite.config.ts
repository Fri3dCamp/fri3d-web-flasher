import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import githubDownloadHandler from "./api/github-download.js";
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
  plugins: [react(), tailwindcss(), apiProxy()],
});
