import { Buffer } from "node:buffer";

// Repos allowed through the local dev proxy. Production goes through the
// Vercel-hosted proxy, which enforces its own ALLOWED_REPOS env var.
const ALLOWED_REPOS = new Set([
  "Fri3dCamp/badge_firmware_MicroPythonOS",
  "Fri3dCamp/communicator_2026",
  "Fri3dCamp/communicator_2024",
  "Fri3dCamp/dj_2026",
]);

/**
 * Serverless proxy that returns the GitHub releases listing for the badge
 * firmware repo. Going through the server keeps the GitHub API host fixed and
 * lets the response be cached, reducing the chance of hitting GitHub's
 * unauthenticated rate limit from many browsers.
 *
 * Used both by Vercel (the `/api` directory is auto-detected) and by the Vite dev
 * server middleware (see vite.config.ts).
 */
export default async function handler(_req, res) {
  try {
    const requestUrl = new URL(_req.url ?? "", "http://localhost");
    const selectedRepo = requestUrl.searchParams.get("repo");

    if (!selectedRepo || !ALLOWED_REPOS.has(selectedRepo)) {
      res.statusCode = 403;
      res.end("Repo not allowed");
      return;
    }

    const upstream = await fetch(`https://api.github.com/repos/${selectedRepo}/releases`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "fri3d-web-flasher",
      },
    });

    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end(`Upstream error ${upstream.status}`);
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.end(buffer);
  } catch (error) {
    console.error("releases proxy error", error);
    res.statusCode = 500;
    res.end("Proxy error");
  }
}
