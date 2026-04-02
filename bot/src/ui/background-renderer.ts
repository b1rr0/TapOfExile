/**
 * Background renderer with camera/viewport system.
 *
 * The background image is scaled using "cover" logic:
 *   scale = max(canvasH / imgH, canvasW / imgW)
 * This guarantees the image always covers the entire canvas -
 * no black bars on any side, regardless of device aspect ratio.
 *
 * A horizontal camera (`_cameraX`) pans left→right as the player
 * progresses through the location's monsters.
 *
 * Vertically the image is bottom-aligned (ground level visible).
 *
 * Supports smooth pan transitions via setCameraTarget() + updateCamera(dt).
 */

/** Default fallback background. */
const DEFAULT_BG: string = "/assets/background/castle/inventory.png";

export class BackgroundRenderer {
  _bgImage: HTMLImageElement | null;
  _loaded: boolean;
  _currentSrc: string | null;

  // Camera state (horizontal, in device-pixel space of the scaled image)
  _cameraX: number;
  _targetCameraX: number;
  _panStartX: number;
  _panActive: boolean;
  _panElapsed: number;
  _panDuration: number;

  constructor() {
    this._bgImage = null;
    this._loaded = false;
    this._currentSrc = null;

    // Camera state (in device-pixel space of the scaled image)
    this._cameraX = 0;
    this._targetCameraX = 0;
    this._panStartX = 0;
    this._panActive = false;
    this._panElapsed = 0;
    this._panDuration = 1.2;
  }

  // ─── Loading ──────────────────────────────────────────

  async load(src?: string | null): Promise<void> {
    const target = src || DEFAULT_BG;
    if (this._currentSrc === target && this._loaded) return;

    this._currentSrc = target;
    try {
      this._bgImage = await this._loadImage(target);
      this._loaded = true;
      console.log(`[BG] Loaded: ${target} (${this._bgImage.naturalWidth}x${this._bgImage.naturalHeight})`);
    } catch (err) {
      console.error(`[BG] FAILED to load: ${target}`, err);
      // Fallback: try default bg
      if (target !== DEFAULT_BG) {
        this._bgImage = await this._loadImage(DEFAULT_BG);
        this._loaded = true;
        console.log(`[BG] Fallback loaded: ${DEFAULT_BG}`);
      } else {
        throw err;
      }
    }

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

  getMaxPan(canvasW: number, canvasH: number): number {
    if (!this._loaded) return 0;
    const img = this._bgImage!;
    const scale = Math.max(canvasH / img.naturalHeight, canvasW / img.naturalWidth);
    const drawW = img.naturalWidth * scale * 1.30;
    return Math.max(0, drawW - canvasW);
  }

  setCameraTarget(x: number): void {
    this._targetCameraX = x;
    this._panStartX = this._cameraX;
    this._panActive = true;
    this._panElapsed = 0;
  }

  snapCamera(x: number): void {
    this._cameraX = x;
    this._targetCameraX = x;
    this._panActive = false;
    this._panElapsed = 0;
  }

  updateCamera(dt: number): boolean {
    if (!this._panActive) return false;

    this._panElapsed += dt;

    if (this._panElapsed >= this._panDuration) {
      this._cameraX = this._targetCameraX;
      this._panActive = false;
      return false;
    }

    const t = this._panElapsed / this._panDuration;
    const eased = 1 - Math.pow(1 - t, 3);
    this._cameraX = this._panStartX + (this._targetCameraX - this._panStartX) * eased;
    return true;
  }

  // ─── Stage (compat) ───────────────────────────────────

  setStage(_stage: number): void {
    // no-op, kept for API compat
  }

  // ─── Rendering ────────────────────────────────────────

  /**
   * Draw the background directly onto the provided context.
   * No caching - simple, reliable, always fills the canvas.
   */
  private _drawLogged = false;

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this._loaded || !this._bgImage) {
      if (!this._drawLogged) {
        console.warn(`[BG] draw skipped: loaded=${this._loaded}, hasImage=${!!this._bgImage}, canvas=${w}x${h}`);
        this._drawLogged = true;
      }
      return;
    }

    const img = this._bgImage;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    if (imgW === 0 || imgH === 0) return;

    // Cover scale + generous stretch to eliminate all grey edges
    const scale = Math.max(h / imgH, w / imgW);
    const drawW = imgW * scale * 1.30;
    const drawH = imgH * scale * 1.30;

    // Horizontal pan — clamp so right edge never goes past canvas
    const maxPan = Math.max(0, drawW - w);
    const camX = Math.max(0, Math.min(this._cameraX, maxPan));

    // Bottom-aligned + 10% shift down
    const dy = h - drawH + drawH * 0.10;

    // Dark fill underneath to guarantee no grey leaks
    ctx.fillStyle = "#050208";
    ctx.fillRect(0, 0, w, h);

    ctx.drawImage(img, -camX, dy, drawW, drawH);
  }

  // ─── Cleanup ──────────────────────────────────────────

  destroy(): void {
    this._bgImage = null;
    this._loaded = false;
    this._currentSrc = null;
  }
}
