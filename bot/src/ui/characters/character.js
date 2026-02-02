import { SpriteEngine } from "../sprite-engine.js";

/**
 * Character — base class for any sprite-based entity on the battle scene.
 *
 * Encapsulates:
 *  - SpriteEngine instance (animation playback)
 *  - Position, size, flip
 *  - Entrance slide animation
 *  - Death animation + alpha fade
 *  - Shake effect on damage
 *
 * Subclasses (HeroCharacter, EnemyCharacter) add role-specific behaviour.
 *
 * @example
 *   const hero = new Character({
 *     spriteConfig: { basePath: "...", animations: { idle: {...} } },
 *     x: 0, groundLine: 0.85, w: 252, h: 336, flipX: false,
 *   });
 *   await hero.load();
 *   hero.play("idle");
 *   // in tick:  hero.update(dt, canvasW, canvasH, dpr);
 *   // in draw:  hero.draw(ctx, canvasW, canvasH, dpr);
 */
export class Character {
  /**
   * @param {Object} opts
   * @param {Object} opts.spriteConfig  — { basePath, animations } for SpriteEngine
   * @param {number} [opts.x=0]         — X position in CSS pixels (absolute)
   * @param {number} [opts.xRatio=null]  — X as fraction of canvas width (overrides x)
   * @param {number} [opts.xOffset=0]   — extra X offset in CSS pixels (added after xRatio)
   * @param {number} [opts.groundLine=0.85] — Y anchor as fraction of canvas height
   * @param {number} opts.w             — draw width in CSS pixels
   * @param {number} opts.h             — draw height in CSS pixels
   * @param {boolean} [opts.flipX=false] — mirror horizontally
   * @param {number} [opts.anchorOffsetY=0] — fraction of sprite height that is
   *        empty below the character's feet. Shifts the sprite down so feet
   *        sit exactly on the ground line.
   * @param {number} [opts.scale=1] — visual scale multiplier applied on top of
   *        defaultSize. Used to normalise characters to a uniform visual height.
   */
  constructor({
    spriteConfig,
    x = null,
    xRatio = null,
    xOffset = 0,
    groundLine = 0.85,
    w,
    h,
    flipX = false,
    anchorOffsetY = 0,
    scale = 1,
  }) {
    // Sprite engine
    this._spriteConfig = spriteConfig;
    this.engine = new SpriteEngine(spriteConfig);

    // Position config (stored, resolved in draw)
    this._xAbsolute = x;       // absolute X (CSS px), used if xRatio is null
    this._xRatio = xRatio;     // fractional X (0..1 of canvas width)
    this._xOffset = xOffset;   // extra offset added to xRatio result
    this._groundLine = groundLine;
    this._baseW = w;
    this._baseH = h;
    this._flipX = flipX;
    this._anchorOffsetY = anchorOffsetY;
    this._scale = scale;

    // --- Entrance animation ---
    this._entering = false;
    this._enterOffset = 0;   // current slide offset (px, positive = to the right)
    this._enterSpeed = 0;    // px per second

    // --- Death fade ---
    this._dying = false;
    this._deathAlpha = 1;
    this._visible = true;

    // --- Shake ---
    this._shake = 0;          // current shake intensity (px)
    this._shakeDecay = 80;    // px/s decay rate

    // --- Dirty flag (aggregates engine + animations) ---
    this._animDirty = false;
  }

  // ─── Lifecycle ───────────────────────────────────────────

  /** Load sprite assets. Returns a promise. */
  async load() {
    await this.engine.load();
  }

  /** Clean up. */
  destroy() {
    this.engine.destroy();
  }

  // ─── Public getters ──────────────────────────────────────

  get loaded() {
    return this.engine.loaded;
  }

  get visible() {
    return this._visible;
  }

  get needsRedraw() {
    return this.engine.needsRedraw || this._animDirty;
  }

  clearRedraw() {
    this.engine.needsRedraw = false;
    this._animDirty = false;
  }

  // ─── Animation helpers ──────────────────────────────────

  /** Delegate to SpriteEngine.play(). */
  play(name, opts = {}) {
    this.engine.play(name, opts);
  }

  /** Start a shake effect of given intensity (px). */
  shake(intensity = 6) {
    this._shake = intensity;
    this._animDirty = true;
  }

  /**
   * Begin entrance slide from an offset.
   * @param {number} offset — starting offset in CSS px (positive = right of target)
   * @param {number} speed  — slide speed in CSS px/s
   */
  startEntrance(offset, speed) {
    this._entering = true;
    this._enterOffset = offset;
    this._enterSpeed = speed;
    this._animDirty = true;
  }

  /**
   * Begin death fade-out. Call AFTER the death sprite animation finishes
   * (typically from an onComplete callback).
   */
  startDeath() {
    this._dying = true;
    this._deathAlpha = 1;
    this._animDirty = true;
  }

  /** Reset all animation state — used before spawning a new instance. */
  resetState() {
    this._entering = false;
    this._enterOffset = 0;
    this._dying = false;
    this._deathAlpha = 1;
    this._visible = true;
    this._shake = 0;
    this._animDirty = true;
  }

  // ─── Per-frame update ───────────────────────────────────

  /**
   * Advance all animation state.
   * @param {number} dt — delta time in seconds
   */
  update(dt) {
    // Sprite engine frame advance
    this.engine.update(dt);

    // Shake decay
    if (this._shake > 0) {
      this._shake = Math.max(0, this._shake - dt * this._shakeDecay);
      this._animDirty = true;
    }

    // Entrance slide
    if (this._entering) {
      this._enterOffset -= this._enterSpeed * dt;
      if (this._enterOffset <= 0) {
        this._enterOffset = 0;
        this._entering = false;
      }
      this._animDirty = true;
    }

    // Death fade
    if (this._dying) {
      this._deathAlpha -= dt * 2.5;
      if (this._deathAlpha <= 0) {
        this._deathAlpha = 0;
        this._dying = false;
        this._visible = false;
      }
      this._animDirty = true;
    }
  }

  // ─── Rendering ──────────────────────────────────────────

  /**
   * Draw the character on the canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasW — canvas width in device pixels
   * @param {number} canvasH — canvas height in device pixels
   * @param {number} dpr    — devicePixelRatio
   */
  draw(ctx, canvasW, canvasH, dpr) {
    if (!this._visible || !this.engine.loaded) return;

    const s = this._scale;
    const w = this._baseW * dpr * 1.56 * s;
    const h = this._baseH * dpr * 1.56 * s;

    // Resolve X position
    let x;
    if (this._xRatio !== null) {
      x = canvasW * this._xRatio + this._xOffset * dpr;
    } else {
      x = (this._xAbsolute ?? 0) * dpr;
    }

    // Apply entrance offset
    x += this._enterOffset * dpr;

    // Apply shake
    x += this._shake * dpr;

    // Center sprite horizontally: x points to character midpoint
    x -= w / 2;

    // Y: anchor to ground line, shift down by empty space below feet
    const y = canvasH * this._groundLine - h + h * this._anchorOffsetY;

    // Draw with optional alpha (death fade)
    if (this._dying && this._deathAlpha < 1) {
      ctx.save();
      ctx.globalAlpha = this._deathAlpha;
      this.engine.drawFrame(ctx, x, y, w, h, this._flipX);
      ctx.restore();
    } else {
      this.engine.drawFrame(ctx, x, y, w, h, this._flipX);
    }
  }
}
