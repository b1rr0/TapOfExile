/**
 * Mini sprite engine — JSON atlas + PNG based.
 *
 * Each animation = JSON (Aseprite atlas format) + PNG sprite strip.
 * JSON provides exact frame rects {x, y, w, h} — no guesswork.
 * Dirty-render: sets needsRedraw only when frame changes.
 */

export class SpriteEngine {
  /**
   * @param {Object} config
   *   { basePath, animations: { name: { json, fps?, loop } } }
   */
  constructor(config) {
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
  async load() {
    const entries = Object.entries(this.config.animations);
    const basePath = this.config.basePath;

    try {
      const results = await Promise.all(
        entries.map(async ([name, anim]) => {
          // Load JSON atlas
          const resp = await fetch(`${basePath}/${anim.json}`);
          const atlas = await resp.json();

          // PNG path from JSON meta or same folder
          const pngFile = atlas.meta.image;
          const img = await this._loadImage(`${basePath}/${pngFile}`);

          // Extract frame rects from JSON
          const frames = atlas.frames.map((f) => f.frame); // {x,y,w,h}

          // FPS: use config override, or derive from JSON duration (ms)
          const fps =
            anim.fps ||
            (atlas.frames[0]?.duration
              ? Math.round(1000 / atlas.frames[0].duration)
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

  _loadImage(src) {
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
  play(name, opts = {}) {
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
  update(dt) {
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
   * @param {boolean} flipX — mirror horizontally
   */
  drawFrame(ctx, dx, dy, dw, dh, flipX = false) {
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

  isPlaying() {
    return this.playing;
  }

  destroy() {
    this.anims.clear();
    this.loaded = false;
    this.playing = false;
    this.current = null;
  }
}
