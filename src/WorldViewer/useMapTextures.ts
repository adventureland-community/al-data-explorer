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

async function loadSpriteSheets(urls: string[]): Promise<Record<string, HTMLImageElement>> {
  const unique = [...new Set(urls)];
  const images: Record<string, HTMLImageElement> = {};
  await Promise.all(
    unique.map(async (url) => {
      images[url] = await loadImage(url);
    }),
  );
  return images;
}

export function useMapCanvases(
  geometry: Record<string, GGeometry | undefined>,
  tilesets: Record<string, GTileset>,
  spriteUrls: string[],
  mapIds: string[],
  enabled: boolean,
  bakeMaps: boolean,
): {
  art: Record<string, MapArtBake>;
  sheets: Record<string, HTMLImageElement>;
  progress: MapCanvasProgress;
  error: string | null;
} {
  const cacheRef = useRef<Record<string, MapArtBake>>({});
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
      const missing = bakeMaps ? ids.filter((id) => !cacheRef.current[id] && geometry[id]) : [];
      setError(null);
      setProgress({ done: 0, total: missing.length, current: "tilesets" });

      const tilesetPromise = bakeMaps
        ? loadTilesetImages(tilesets)
        : Promise.resolve<Record<string, HTMLImageElement>>({});
      const [tilesetImages, spriteSheets] = await Promise.all([
        tilesetPromise,
        loadSpriteSheets(spriteKey ? spriteKey.split("|") : []),
      ]);
      if (cancelled) {
        return;
      }
      setSheets(spriteSheets);

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
