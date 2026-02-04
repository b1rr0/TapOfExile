/**
 * Mini sprite engine — JSON atlas + PNG based.
 *
 * Each animation = JSON (Aseprite atlas format) + PNG sprite strip.
 * JSON provides exact frame rects {x, y, w, h} — no guesswork.
 * Dirty-render: sets needsRedraw only when frame changes.
 */

import type { AnimationConfig } from "../types.js";

interface AnimationData {
  name: string;
  img: HTMLImageElement;
  frames: Array<{ x: number; y: number; w: number; h: number }>;
  frameCount: number;
  fps: number;
  loop: boolean;
}

interface SpriteEngineConfig {
  basePath: string;
  animations: Record<string, AnimationConfig>;
}

interface PlayOptions {
  onComplete?: (() => void) | null;
}

export class SpriteEngine {
  config: SpriteEngineConfig;
  anims: Map<string, AnimationData>;
  loaded: boolean;
  failed: boolean;

  currentName: string;
  current: AnimationData | null;
  frameIndex: number;
  _prevFrame: number;
  elapsed: number;
  playing: boolean;
  onComplete: (() => void) | null;

  needsRedraw: boolean;

  /**
   * @param config
   *   { basePath, animations: { name: { json, fps?, loop } } }
   */
  constructor(config: SpriteEngineConfig) {
    this.config = config;

    // Map<animName, { img, frames: [{x,y,w,h}], frameCount, fps, loop }>
    this.anims = new Map();
    this.loaded = false;
    this.failed = false;

    // Current animation state
    this.currentName = "";
    this.current = null;
    this.frameIndex = 0;
    this._prevFrame = -1;
    this.elapsed = 0;
    this.playing = false;
    this.onComplete = null;

    this.needsRedraw = false;
  }

  /**
   * Load all JSON + PNG pairs in parallel.
   */
  async load(): Promise<void> {
    const entries = Object.entries(this.config.animations);
    const basePath = this.config.basePath;

    try {
      const results = await Promise.all(
        entries.map(async ([name, anim]): Promise<AnimationData> => {
          // Load JSON atlas
          const resp = await fetch(`${basePath}/${anim.json}`);
          const atlas = await resp.json();

          // PNG path from JSON meta or same folder
          const pngFile = atlas.meta.image;
          const img = await this._loadImage(`${basePath}/${pngFile}`);

          // Normalize frames: Aseprite exports both array and hash formats
          const rawFrames = Array.isArray(atlas.frames)
            ? atlas.frames
            : Object.values(atlas.frames);

          // Extract frame rects from JSON
          const frames = (rawFrames as Array<{ frame: { x: number; y: number; w: number; h: number } }>).map((f) => f.frame); // {x,y,w,h}

          // FPS: use config override, or derive from JSON duration (ms)
          const fps =
            anim.fps ||
            ((rawFrames as Array<{ duration?: number }>)[0]?.duration
              ? Math.round(1000 / (rawFrames as Array<{ duration: number }>)[0].duration)
              : 10);

          return {
            name,
            img,
            frames,
            frameCount: frames.length,
            fps,
            loop: anim.loop ?? false,
          };
        })
      );

      for (const r of results) {
        this.anims.set(r.name, r);
      }

      this.loaded = true;
      this.needsRedraw = true;
    } catch (err) {
      this.failed = true;
      throw err;
    }
  }

  _loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  /**
   * Start playing a named animation.
   */
  play(name: string, opts: PlayOptions = {}): void {
    const anim = this.anims.get(name);
    if (!anim) return;

    // Don't restart the same looping animation
    if (this.currentName === name && this.playing && anim.loop) return;

    this.current = anim;
    this.currentName = name;
    this.frameIndex = 0;
    this._prevFrame = -1;
    this.elapsed = 0;
    this.playing = true;
    this.onComplete = opts.onComplete || null;
    this.needsRedraw = true;
  }

  /**
   * Advance frame counter. Sets needsRedraw when frame changes.
   */
  update(dt: number): void {
    if (!this.playing || !this.current) return;

    this.elapsed += dt;
    const dur = 1 / this.current.fps;

    if (this.elapsed >= dur) {
      this.elapsed -= dur;
      if (this.elapsed > dur) this.elapsed = 0;

      this.frameIndex++;

      if (this.frameIndex >= this.current.frameCount) {
        if (this.current.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.current.frameCount - 1;
          this.playing = false;
          const cb = this.onComplete;
          this.onComplete = null;
          if (cb) cb();
        }
      }
    }

    if (this.frameIndex !== this._prevFrame) {
      this._prevFrame = this.frameIndex;
      this.needsRedraw = true;
    }
  }

  /**
   * Draw current frame from JSON-defined rect.
   * @param flipX — mirror horizontally
   */
  drawFrame(ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number, flipX: boolean = false): void {
    if (!this.loaded || !this.current) return;

    const { img, frames } = this.current;
    const f = frames[this.frameIndex];

    ctx.imageSmoothingEnabled = false;

    if (flipX) {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  destroy(): void {
    this.anims.clear();
    this.loaded = false;
    this.playing = false;
    this.current = null;
  }
}
