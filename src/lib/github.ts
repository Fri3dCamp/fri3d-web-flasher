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

  // GitHub Pages only serves static assets and has no serverless `/api` routes.
  // Fall back to the Vercel-hosted proxy for release listing and downloads.
  if (window.location.hostname.endsWith("github.io")) {
    return DEFAULT_PROXY_ORIGIN;
  }

  return "";
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

/** Fetch the releases of one of the allowed Fri3d repos (see api/releases.js). */
export async function fetchReleases(repo: string, forceRefresh = false): Promise<GithubRelease[]> {
  const cacheBuster = forceRefresh ? `&t=${Date.now()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/releases?repo=${repo}${cacheBuster}`);
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
