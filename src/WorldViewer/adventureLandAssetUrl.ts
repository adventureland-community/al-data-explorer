/** Local same-origin path under public/, query string stripped. */
export function adventureLandAssetUrl(file: string): string {
  const path = file.startsWith("/") ? file : `/${file}`;
  return path.split("?")[0];
}

export interface ArtAssetRef {
  /** Path served from public/ (no query). */
  path: string;
  /** adventure.land path, including cache-bust query when present. */
  remotePath: string;
}

export function collectArtAssets(g: {
  tilesets?: Record<string, { file?: string }>;
  sprites?: Record<string, { file?: string }>;
}): ArtAssetRef[] {
  const byPath = new Map<string, string>();
  const add = (file?: string) => {
    if (!file) {
      return;
    }
    const remotePath = file.startsWith("/") ? file : `/${file}`;
    byPath.set(adventureLandAssetUrl(remotePath), remotePath);
  };
  for (const entry of Object.values(g.tilesets || {})) {
    add(entry?.file);
  }
  for (const entry of Object.values(g.sprites || {})) {
    add(entry?.file);
  }
  return [...byPath.entries()]
    .map(([path, remotePath]) => ({ path, remotePath }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export const MISSING_LOCAL_ART_HINT =
  "Run npm run update to download tilesets and sprite sheets into public/images.";

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Missing local art ${url}. ${MISSING_LOCAL_ART_HINT}`));
    image.src = url;
  });
}
