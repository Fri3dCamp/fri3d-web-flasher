import { useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button, ButtonType } from "./Button";

const RELEASES_URL = "/api/releases";
// Only releases that ship the `fri3d_flasher_<fw>_firmware_for_<badge>_badge.zip`
// assets are supported (introduced in 0.10.2). Older legacy zips are ignored.
const ASSET_REGEX = /^fri3d_flasher_\d+_firmware_for_(\d+)_badge\.zip$/;
const DEFAULT_BADGE = "2026";

function badgeFromAssetName(name: string): string | null {
  const match = name.match(ASSET_REGEX);
  return match ? match[1] : null;
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  assets: GithubAsset[];
}

interface BadgeOption {
  badge: string;
  asset: GithubAsset;
}

interface FlashableRelease {
  tag: string;
  name: string;
  prerelease: boolean;
  badges: BadgeOption[];
}

const selectClassName = clsx(
  "rounded-md border-4 border-black bg-white px-3 py-2 font-display text-sm font-bold uppercase text-black shadow-hard-sm",
  "disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none",
);

export function ReleaseSelector({ advanced = false }: { advanced?: boolean }) {
  const { loadFirmwareFromUrl, flash, isFlashing } = useContext(EsptoolContext);

  const [releases, setReleases] = useState<FlashableRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedBadge, setSelectedBadge] = useState<string>(DEFAULT_BADGE);

  useEffect(() => {
    let cancelled = false;

    async function fetchReleases() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(RELEASES_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: GithubRelease[] = await response.json();
        const flashable: FlashableRelease[] = data
          .map((release) => {
            const badges = release.assets
              .map((asset) => {
                const badge = badgeFromAssetName(asset.name);
                if (!badge) {
                  return null;
                }
                return { badge, asset } satisfies BadgeOption;
              })
              .filter((badge): badge is BadgeOption => badge !== null)
              .sort((a, b) => b.badge.localeCompare(a.badge));
            return {
              tag: release.tag_name,
              name: release.name || release.tag_name,
              prerelease: release.prerelease,
              badges,
            };
          })
          .filter((release) => release.badges.length > 0);

        if (cancelled) {
          return;
        }

        setReleases(flashable);
        if (flashable.length > 0) {
          setSelectedTag(flashable[0].tag);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReleases();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRelease = useMemo(
    () => releases.find((release) => release.tag === selectedTag),
    [releases, selectedTag],
  );

  // Keep the selected badge valid for the chosen release, preferring 2026.
  useEffect(() => {
    if (!selectedRelease) {
      return;
    }
    const hasSelected = selectedRelease.badges.some((badge) => badge.badge === selectedBadge);
    if (!hasSelected) {
      const preferred = selectedRelease.badges.find((badge) => badge.badge === DEFAULT_BADGE);
      setSelectedBadge((preferred ?? selectedRelease.badges[0]).badge);
    }
  }, [selectedRelease, selectedBadge]);

  const selectedAsset = useMemo(
    () => selectedRelease?.badges.find((badge) => badge.badge === selectedBadge)?.asset,
    [selectedRelease, selectedBadge],
  );

  async function handleFlash() {
    if (!selectedAsset) {
      return;
    }
    setDownloading(true);
    try {
      // GitHub release downloads redirect to githubusercontent.com without CORS
      // headers, so they are fetched through a same-origin serverside proxy.
      const proxyUrl = `/api/github-download?url=${encodeURIComponent(selectedAsset.browser_download_url)}`;
      const firmware = await loadFirmwareFromUrl(proxyUrl, selectedAsset.name);
      if (firmware) {
        await flash(firmware);
      }
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <p className="mb-4 text-center font-display font-semibold">Releases worden geladen...</p>;
  }

  if (error || releases.length === 0) {
    return (
      <p className="mb-4 text-center font-display font-semibold">
        Kon de releases niet ophalen van GitHub. Laad hieronder een bestand op.
      </p>
    );
  }

  const busy = downloading || isFlashing;

  return (
    <div
      className={clsx(
        "mb-4 flex gap-3",
        advanced ? "flex-row flex-wrap items-end justify-center" : "w-96 flex-col",
      )}
    >
      {advanced && (
        <>
          <label className="flex flex-col gap-1">
            <span className="font-display text-xs font-bold uppercase tracking-wide">Versie</span>
            <select
              className={selectClassName}
              value={selectedTag}
              disabled={busy}
              onChange={(event) => setSelectedTag(event.target.value)}
            >
              {releases.map((release) => (
                <option key={release.tag} value={release.tag}>
                  {release.name}
                  {release.prerelease ? " (pre-release)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-display text-xs font-bold uppercase tracking-wide">Badge</span>
            <select
              className={selectClassName}
              value={selectedBadge}
              disabled={busy || !selectedRelease}
              onChange={(event) => setSelectedBadge(event.target.value)}
            >
              {selectedRelease?.badges.map((badge) => (
                <option key={badge.badge} value={badge.badge}>
                  {badge.badge} badge
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <Button type={ButtonType.Primary} onClick={handleFlash} disabled={busy || !selectedAsset}>
        {downloading && !isFlashing
          ? "Firmware downloaden..."
          : advanced
            ? "Download en flash"
            : `Flash nieuwste firmware (badge ${selectedBadge})`}
      </Button>
    </div>
  );
}
