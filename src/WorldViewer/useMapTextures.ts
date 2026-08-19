import { useEffect, useRef, useState } from "react";
import { GGeometry, GTileset } from "typed-adventureland";
import { adventureLandAssetUrl, loadImage } from "./adventureLandAssetUrl";
import { MapArtBake, renderMapArt } from "./renderMapCanvas";

export interface MapCanvasProgress {
  done: number;
  total: number;
  current: string;
}

async function loadTilesetImages(
  tilesets: Record<string, GTileset>,
): Promise<Record<string, HTMLImageElement>> {
  const images: Record<string, HTMLImageElement> = {};
  await Promise.all(
    Object.entries(tilesets).map(async ([key, tileset]) => {
      if (!tileset?.file) {
        return;
      }
      images[key] = await loadImage(adventureLandAssetUrl(tileset.file));
    }),
  );
  return images;
}

async function loadSpriteSheets(
  urls: string[],
  cache: Record<string, HTMLImageElement>,
): Promise<Record<string, HTMLImageElement>> {
  const unique = [...new Set(urls)];
  const images: Record<string, HTMLImageElement> = {};
  await Promise.all(
    unique.map(async (url) => {
      const cached = cache[url];
      if (cached) {
        images[url] = cached;
        return;
      }
      images[url] = await loadImage(url);
    }),
  );
  return images;
}

function mergeSheetCache(
  prev: Record<string, HTMLImageElement>,
  cache: Record<string, HTMLImageElement>,
): Record<string, HTMLImageElement> {
  const prevKeys = Object.keys(prev);
  const cacheKeys = Object.keys(cache);
  if (prevKeys.length === cacheKeys.length) {
    let same = true;
    for (const key of prevKeys) {
      if (prev[key] !== cache[key]) {
        same = false;
        break;
      }
    }
    if (same) {
      return prev;
    }
  }
  return { ...cache };
}

/** Sort map IDs so `priority` (and its immediate context) bake first. */
function prioritizeBakeOrder(ids: string[], priority: string | null): string[] {
  if (!priority) {
    return ids;
  }
  const first: string[] = [];
  const rest: string[] = [];
  for (const id of ids) {
    if (id === priority) {
      first.unshift(id);
    } else {
      rest.push(id);
    }
  }
  return [...first, ...rest];
}

export function useMapCanvases(
  geometry: Record<string, GGeometry | undefined>,
  tilesets: Record<string, GTileset>,
  spriteUrls: string[],
  mapIds: string[],
  enabled: boolean,
  bakeMaps: boolean,
  priorityMap?: string | null,
): {
  art: Record<string, MapArtBake>;
  sheets: Record<string, HTMLImageElement>;
  progress: MapCanvasProgress;
  error: string | null;
} {
  const cacheRef = useRef<Record<string, MapArtBake>>({});
  const sheetCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const priorityRef = useRef(priorityMap);
  priorityRef.current = priorityMap;
  const [art, setArt] = useState<Record<string, MapArtBake>>({});
  const [sheets, setSheets] = useState<Record<string, HTMLImageElement>>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MapCanvasProgress>({
    done: 0,
    total: 0,
    current: "",
  });
  const mapKey = mapIds.join("|");
  const spriteKey = spriteUrls.join("|");

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let cancelled = false;

    const run = async () => {
      const ids = mapKey ? mapKey.split("|") : [];
      const unsorted = bakeMaps ? ids.filter((id) => !cacheRef.current[id] && geometry[id]) : [];
      const missing = prioritizeBakeOrder(unsorted, priorityRef.current ?? null);
      setError(null);
      setProgress({ done: 0, total: missing.length, current: "tilesets" });
      if (Object.keys(cacheRef.current).length > 0) {
        setArt({ ...cacheRef.current });
      }

      const tilesetPromise = bakeMaps
        ? loadTilesetImages(tilesets)
        : Promise.resolve<Record<string, HTMLImageElement>>({});
      const [tilesetImages, spriteSheets] = await Promise.all([
        tilesetPromise,
        loadSpriteSheets(spriteKey ? spriteKey.split("|") : [], sheetCacheRef.current),
      ]);
      if (cancelled) {
        return;
      }
      for (const [url, image] of Object.entries(spriteSheets)) {
        sheetCacheRef.current[url] = image;
      }
      setSheets((prev) => mergeSheetCache(prev, sheetCacheRef.current));

      for (let i = 0; i < missing.length; i += 1) {
        if (cancelled) {
          return;
        }
        const id = missing[i];
        const geo = geometry[id];
        if (!geo) {
          continue;
        }

        setProgress({
          done: i,
          total: missing.length,
          current: id,
        });

        const baked = renderMapArt(geo, tilesetImages, tilesets);
        if (!baked) {
          continue;
        }

        cacheRef.current[id] = baked;
        setArt({ ...cacheRef.current });
        setProgress({
          done: i + 1,
          total: missing.length,
          current: id,
        });
        await new Promise((resolve) => {
          window.setTimeout(resolve, 0);
        });
      }
    };

    run().catch((cause) => {
      if (cancelled) {
        return;
      }
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error(message);
      setError(message);
    });
    return () => {
      cancelled = true;
    };
  }, [bakeMaps, enabled, geometry, mapKey, spriteKey, tilesets]);

  return { art, sheets, progress, error };
}
