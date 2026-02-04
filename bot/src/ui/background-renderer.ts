/**
 * Background renderer with camera/viewport system.
 *
 * The background image is scaled to fit the canvas HEIGHT, making it wider
 * than the canvas. A camera (`_cameraX`) controls which horizontal slice
 * is visible — creating a panoramic scrolling effect as the player
 * progresses through the location's monsters.
 *
 * Supports smooth pan transitions via setCameraTarget() + updateCamera(dt).
 */

/** Default fallback background. */
const DEFAULT_BG: string = "/src/assets/background/castle/img.png";

export class BackgroundRenderer {
  _bgImage: HTMLImageElement | null;
  _loaded: boolean;
  _currentSrc: string | null;

  // Cache
  _dirty: boolean;
  _cache: HTMLCanvasElement | null;
  _cacheW: number;
  _cacheH: number;

  // Camera state (in device-pixel space of the scaled image)
  _cameraX: number;
  _targetCameraX: number;
  _panStartX: number;
  _panActive: boolean;
  _panElapsed: number;
  _panDuration: number;

  // Cached scaling values (recomputed on draw when dimensions change)
  _scale: number;
  _drawW: number;
  _drawH: number;
  _lastW: number;
  _lastH: number;

  constructor() {
    this._bgImage = null;
    this._loaded = false;
    this._currentSrc = null;

    // Cache
    this._dirty = true;
    this._cache = null;
    this._cacheW = 0;
    this._cacheH = 0;

    // Camera state (in device-pixel space of the scaled image)
    this._cameraX = 0;          // current viewport left edge
    this._targetCameraX = 0;    // where camera is heading
    this._panStartX = 0;        // cameraX at pan start
    this._panActive = false;
    this._panElapsed = 0;
    this._panDuration = 1.2;    // seconds

    // Cached scaling values (recomputed on draw when dimensions change)
    this._scale = 1;
    this._drawW = 0;
    this._drawH = 0;
    this._lastW = 0;
    this._lastH = 0;
  }

  // ─── Loading ──────────────────────────────────────────

  /**
   * Load the background image.
   * @param src — image path; defaults to castle background
   */
  async load(src?: string | null): Promise<void> {
    const target = src || DEFAULT_BG;
    if (this._currentSrc === target && this._loaded) return;

    this._currentSrc = target;
    this._bgImage = await this._loadImage(target);
    this._loaded = true;
    this._dirty = true;

    // Reset camera for new image
    this._cameraX = 0;
    this._targetCameraX = 0;
    this._panActive = false;
  }

  async setBackground(src?: string | null): Promise<void> {
    if (!src || src === this._currentSrc) return;
    await this.load(src);
  }

  _loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  // ─── Camera ───────────────────────────────────────────

  /**
   * Maximum horizontal pan range in device pixels.
   * 0 means the image fits exactly or is narrower than canvas.
   * @param canvasW — canvas width in device pixels
   * @param canvasH — canvas height in device pixels
   */
  getMaxPan(canvasW: number, canvasH: number): number {
    if (!this._loaded) return 0;
    const img = this._bgImage!;
    const scale = canvasH / img.naturalHeight;
    const drawW = img.naturalWidth * scale;
    return Math.max(0, drawW - canvasW);
  }

  /**
   * Set the camera target and begin a smooth pan.
   * @param x — target cameraX in device pixels
   */
  setCameraTarget(x: number): void {
    this._targetCameraX = x;
    this._panStartX = this._cameraX;
    this._panActive = true;
    this._panElapsed = 0;
  }

  /**
   * Snap camera to a position immediately (no animation).
   * @param x — cameraX in device pixels
   */
  snapCamera(x: number): void {
    this._cameraX = x;
    this._targetCameraX = x;
    this._panActive = false;
    this._panElapsed = 0;
    this._dirty = true;
  }

  /**
   * Advance the pan animation.
   * @param dt — delta time in seconds
   * @returns true if pan is still active
   */
  updateCamera(dt: number): boolean {
    if (!this._panActive) return false;

    this._panElapsed += dt;

    if (this._panElapsed >= this._panDuration) {
      // Pan complete
      this._cameraX = this._targetCameraX;
      this._panActive = false;
      this._dirty = true;
      return false;
    }

    // Ease-out cubic: fast start, smooth stop
    const t = this._panElapsed / this._panDuration;
    const eased = 1 - Math.pow(1 - t, 3);

    this._cameraX = this._panStartX + (this._targetCameraX - this._panStartX) * eased;
    this._dirty = true;
    return true;
  }

  // ─── Stage (compat) ───────────────────────────────────

  setStage(_stage: number): void {
    this._dirty = true;
  }

  // ─── Rendering ────────────────────────────────────────

  /**
   * Draw the background viewport onto a canvas context.
   *
   * Scaling: height-fit (scale = canvasH / imgH).
   * The image fills the canvas vertically and is wider horizontally.
   * _cameraX selects which horizontal slice to show.
   */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this._loaded) return;

    const img = this._bgImage!;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Height-fit scale
    const scale = h / imgH;
    const drawW = imgW * scale;
    const drawH = h;

    // Max pan (clamped to 0 if image narrower than canvas)
    const maxPan = Math.max(0, drawW - w);

    // Clamp camera
    const camX = Math.max(0, Math.min(this._cameraX, maxPan));

    // If image is narrower than or equal to canvas, center it (cover fallback)
    if (maxPan <= 0) {
      // Use cache for static centered image
      if (!this._dirty && this._cache && this._cacheW === w && this._cacheH === h) {
        ctx.drawImage(this._cache, 0, 0);
        return;
      }
      this._ensureCache(w, h);
      const cctx = this._cache!.getContext("2d")!;
      cctx.imageSmoothingEnabled = false;
      cctx.clearRect(0, 0, w, h);
      const dx = (w - drawW) / 2;
      cctx.drawImage(img, dx, 0, drawW, drawH);
      ctx.drawImage(this._cache!, 0, 0);
      this._dirty = false;
      return;
    }

    // Use cache when not panning
    if (!this._dirty && !this._panActive && this._cache && this._cacheW === w && this._cacheH === h) {
      ctx.drawImage(this._cache, 0, 0);
      return;
    }

    this._ensureCache(w, h);
    const cctx = this._cache!.getContext("2d")!;
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, w, h);

    // Draw image shifted left by camera position
    cctx.drawImage(img, -camX, 0, drawW, drawH);

    ctx.drawImage(this._cache!, 0, 0);
    this._dirty = false;
  }

  _ensureCache(w: number, h: number): void {
    if (!this._cache || this._cacheW !== w || this._cacheH !== h) {
      this._cache = document.createElement("canvas");
      this._cache.width = w;
      this._cache.height = h;
      this._cacheW = w;
      this._cacheH = h;
    }
  }

  // ─── Cleanup ──────────────────────────────────────────

  destroy(): void {
    this._bgImage = null;
    this._cache = null;
    this._loaded = false;
    this._currentSrc = null;
  }
}
