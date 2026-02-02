/**
 * Background renderer: draws a static background image scaled to fill the canvas.
 *
 * Supports per-location backgrounds via setBackground(src).
 * Cached on offscreen canvas for performance.
 */

/** Default fallback background. */
const DEFAULT_BG = "/src/assets/background/castle/img.png";

export class BackgroundRenderer {
  constructor() {
    this._bgImage = null;
    this._loaded = false;
    this._currentSrc = null;

    // Prebuilt background (cached)
    this._cache = null;
    this._cacheW = 0;
    this._cacheH = 0;
    this._dirty = true;
  }

  /**
   * Load the background image.
   * @param {string} [src] — image path; defaults to castle background
   * @returns {Promise<void>}
   */
  async load(src) {
    const target = src || DEFAULT_BG;
    if (this._currentSrc === target && this._loaded) return;

    this._currentSrc = target;
    this._bgImage = await this._loadImage(target);
    this._loaded = true;
    this._dirty = true;
  }

  /**
   * Switch to a different background image.
   * @param {string} src — image path
   * @returns {Promise<void>}
   */
  async setBackground(src) {
    if (!src || src === this._currentSrc) return;
    await this.load(src);
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  /**
   * Stage change — mark dirty to redraw.
   */
  setStage(_stage) {
    this._dirty = true;
  }

  /**
   * Draw the background onto a canvas context.
   * Scales the image to cover the full canvas (cover mode).
   */
  draw(ctx, w, h) {
    if (!this._loaded) return;

    // Use cache if available
    if (!this._dirty && this._cache && this._cacheW === w && this._cacheH === h) {
      ctx.drawImage(this._cache, 0, 0);
      return;
    }

    // Build cache
    if (!this._cache || this._cacheW !== w || this._cacheH !== h) {
      this._cache = document.createElement("canvas");
      this._cache.width = w;
      this._cache.height = h;
      this._cacheW = w;
      this._cacheH = h;
    }

    const cctx = this._cache.getContext("2d");
    cctx.imageSmoothingEnabled = false;

    const img = this._bgImage;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Cover mode: scale to fill, crop overflow
    const scale = Math.max(w / imgW, h / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (w - drawW) / 2;
    const dy = (h - drawH) / 2;

    cctx.drawImage(img, dx, dy, drawW, drawH);

    ctx.drawImage(this._cache, 0, 0);
    this._dirty = false;
  }

  destroy() {
    this._bgImage = null;
    this._cache = null;
    this._loaded = false;
    this._currentSrc = null;
  }
}
