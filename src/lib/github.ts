// Shared helpers for fetching Fri3d firmware releases from GitHub.
//
// GitHub's API and release downloads lack CORS headers for browsers, so all
// requests go through a small serverless proxy (see /api). Downloads are
// cached in the browser's Cache Storage so re-flashing doesn't re-download.

const DEFAULT_PROXY_ORIGIN = "https://fri3d-flasher.vercel.app";
const FIRMWARE_CACHE_NAME = "firmware-downloads";

function getApiBaseUrl(): string {
  const configured = document.querySelector('meta[name="fri3d-api-base-url"]')?.getAttribute("content")?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // Local dev has the API middleware in the Vite server; everywhere else
  // (GitHub Pages, static hosting) use the Vercel-hosted proxy.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "";
  }

  return DEFAULT_PROXY_ORIGIN;
}

export const API_BASE_URL = getApiBaseUrl();

export interface GithubAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  assets: GithubAsset[];
}

// Map firmware keys used in the UI to their GitHub repos. The proxy's
// ALLOWED_REPOS allow-list validates the full "owner/repo" value.
const REPO_BY_KEY: Record<string, string> = {
  badge: "Fri3dCamp/badge_firmware_MicroPythonOS",
  communicator2026: "Fri3dCamp/communicator_2026",
  communicator2024: "Fri3dCamp/communicator_2024",
  dj2026: "Fri3dCamp/dj_2026",
};

/** Fetch the releases of one of the allowed Fri3d repos (see api/releases.js). */
export async function fetchReleases(repoKey: string, forceRefresh = false): Promise<GithubRelease[]> {
  const repo = REPO_BY_KEY[repoKey];
  if (!repo) {
    throw new Error(`Unknown firmware repo key: ${repoKey}`);
  }
  const cacheBuster = forceRefresh ? `&t=${Date.now()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/releases?repo=${encodeURIComponent(repo)}${cacheBuster}`);
  if (!response.ok) {
    throw new Error(`Release request failed (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Download a release asset through the proxy, reusing a persistent copy from
 * the browser's Cache Storage when available.
 */
export async function downloadAsset(asset: GithubAsset, forceRefresh = false): Promise<ArrayBuffer> {
  const url = `${API_BASE_URL}/api/github-download?url=${encodeURIComponent(asset.browser_download_url)}`;

  let cache: Cache | undefined;
  if (typeof caches !== "undefined") {
    try {
      cache = await caches.open(FIRMWARE_CACHE_NAME);
      if (!forceRefresh) {
        const cached = await cache.match(url);
        if (cached) {
          return await cached.arrayBuffer();
        }
      }
    } catch (error) {
      console.warn("Firmware cache unavailable, downloading directly", error);
      cache = undefined;
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download mislukt (HTTP ${response.status})`);
  }

  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch (error) {
      console.warn("Could not store firmware in cache", error);
    }
  }

  return await response.arrayBuffer();
}

export async function clearFirmwareCache(): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }
  try {
    await caches.delete(FIRMWARE_CACHE_NAME);
  } catch (error) {
    console.warn("Could not clear firmware cache", error);
  }
}
