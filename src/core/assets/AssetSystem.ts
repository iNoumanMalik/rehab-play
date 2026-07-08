/**
 * Rasterises parameterised SVG sprites into cached <img> elements for fast
 * canvas drawing. Images decode asynchronously; `getOrCreate` returns null
 * until ready so scenes can fall back to procedural shapes with no pop-in gap
 * once preloaded.
 */
class AssetSystem {
  private cache = new Map<string, HTMLImageElement>();
  private ready = new Set<string>();

  getOrCreate(key: string, factory: () => string): HTMLImageElement | null {
    let img = this.cache.get(key);
    if (!img) {
      img = new Image();
      const k = key;
      img.decoding = 'async';
      img.onload = () => this.ready.add(k);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(factory());
      this.cache.set(key, img);
    }
    return this.ready.has(key) ? img : null;
  }

  preload(entries: Array<[string, () => string]>): void {
    for (const [key, factory] of entries) this.getOrCreate(key, factory);
  }
}

export const assets = new AssetSystem();

/** Draw a sprite centred on (x, y), scaled to `size`, optionally rotated (radians). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, size: number, rotation = 0, alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}
