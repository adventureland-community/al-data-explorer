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
      try {
        images[key] = await loadImage(adventureLandAssetUrl(tileset.file));
      } catch (error) {
        console.warn("Tileset failed to load", key, error);
      }
    }),
  );
  return images;
}

export function useMapCanvases(
  geometry: Record<string, GGeometry | undefined>,
  tilesets: Record<string, GTileset>,
  mapIds: string[],
  enabled: boolean,
): { art: Record<string, MapArtBake>; progress: MapCanvasProgress } {
  const cacheRef = useRef<Record<string, MapArtBake>>({});
  const [art, setArt] = useState<Record<string, MapArtBake>>({});
  const [progress, setProgress] = useState<MapCanvasProgress>({
    done: 0,
    total: 0,
    current: "",
  });
  const mapKey = mapIds.join("|");

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let cancelled = false;

    const run = async () => {
      const ids = mapKey ? mapKey.split("|") : [];
      const missing = ids.filter((id) => !cacheRef.current[id] && geometry[id]);
      setProgress({ done: 0, total: missing.length, current: "tilesets" });

      const tilesetImages = await loadTilesetImages(tilesets);
      if (cancelled) {
        return;
      }

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

    run().catch((error) => console.warn("Map canvas bake failed", error));
    return () => {
      cancelled = true;
    };
  }, [enabled, geometry, mapKey, tilesets]);

  return { art, progress };
}
