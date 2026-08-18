/** Same URLs the game and ItemImage use — browser cache applies. */
export function adventureLandAssetUrl(file: string): string {
  return `https://adventure.land${file.startsWith("/") ? file : `/${file}`}`;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}
