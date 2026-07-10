import { Buffer } from "node:buffer";

// Only allow proxying firmware downloads from supported Fri3d firmware repos.
// This prevents the proxy from being abused as an open relay (SSRF protection).
const ALLOWED_HOST = "github.com";
const ALLOWED_PATH_PREFIXES = [
  "/Fri3dCamp/badge_firmware_MicroPythonOS/releases/download/",
  "/Fri3dCamp/communicator_2026/releases/download/",
  "/Fri3dCamp/communicator_2024/releases/download/",
  "/Fri3dCamp/dj_2026/releases/download/",
];

/**
 * Serverless proxy that downloads a GitHub release asset server-side and returns
 * it with permissive CORS headers. GitHub's download URLs redirect to
 * githubusercontent.com without `Access-Control-Allow-Origin`, so a same-origin
 * proxy is required to fetch them from the browser.
 *
 * Used both by Vercel (the `/api` directory is auto-detected) and by the Vite dev
 * server middleware (see vite.config.ts).
 */
export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      res.statusCode = 400;
      res.end("Missing 'url' query parameter");
      return;
    }

    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      res.statusCode = 400;
      res.end("Invalid url");
      return;
    }

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== ALLOWED_HOST ||
      !ALLOWED_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
    ) {
      res.statusCode = 403;
      res.end("URL not allowed");
      return;
    }

    const upstream = await fetch(parsed.toString(), { redirect: "follow" });
    if (!upstream.ok) {
      res.statusCode = upstream.status;
      res.end(`Upstream error ${upstream.status}`);
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.statusCode = 200;
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.end(buffer);
  } catch (error) {
    console.error("github-download proxy error", error);
    res.statusCode = 500;
    res.end("Proxy error");
  }
}
