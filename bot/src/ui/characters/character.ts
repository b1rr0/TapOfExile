import { SpriteEngine } from "../sprite-engine.js";
import type { AnimationConfig } from "../../types.js";

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

interface SpriteConfig {
  basePath: string;
  animations: Record<string, AnimationConfig>;
}

export interface CharacterOpts {
  spriteConfig: SpriteConfig;
  x?: number | null;
  xRatio?: number | null;
  xOffset?: number;
  groundLine?: number;
  w: number;
  h: number;
  flipX?: boolean;
  anchorOffsetY?: number;
  scale?: number;
}

interface CharacterPlayOptions {
  onComplete?: (() => void) | null;
}

export class Character {
  // Sprite engine
  _spriteConfig: SpriteConfig;
  engine: SpriteEngine;

  // Position config (stored, resolved in draw)
  _xAbsolute: number | null;
  _xRatio: number | null;
  _xOffset: number;
  _groundLine: number;
  _baseW: number;
  _baseH: number;
  _flipX: boolean;
  _anchorOffsetY: number;
  _scale: number;

  // Entrance animation
  _entering: boolean;
  _enterOffset: number;
  _enterSpeed: number;

  // Death fade
  _dying: boolean;
  _deathAlpha: number;
  _visible: boolean;

  // Shake
  _shake: number;
  _shakeDecay: number;

  // Dirty flag (aggregates engine + animations)
  _animDirty: boolean;

  /**
   * @param opts — character configuration
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
  }: CharacterOpts) {
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
  async load(): Promise<void> {
    await this.engine.load();
  }

  /** Clean up. */
  destroy(): void {
    this.engine.destroy();
  }

  // ─── Public getters ──────────────────────────────────────

  get loaded(): boolean {
    return this.engine.loaded;
  }

  get visible(): boolean {
    return this._visible;
  }

  get needsRedraw(): boolean {
    return this.engine.needsRedraw || this._animDirty;
  }

  clearRedraw(): void {
    this.engine.needsRedraw = false;
    this._animDirty = false;
  }

  // ─── Animation helpers ──────────────────────────────────

  /** Delegate to SpriteEngine.play(). */
  play(name: string, opts: CharacterPlayOptions = {}): void {
    this.engine.play(name, opts);
  }

  /** Start a shake effect of given intensity (px). */
  shake(intensity: number = 6): void {
    this._shake = intensity;
    this._animDirty = true;
  }

  /**
   * Begin entrance slide from an offset.
   * @param offset — starting offset in CSS px (positive = right of target)
   * @param speed  — slide speed in CSS px/s
   */
  startEntrance(offset: number, speed: number): void {
    this._entering = true;
    this._enterOffset = offset;
    this._enterSpeed = speed;
    this._animDirty = true;
  }

  /**
   * Begin death fade-out. Call AFTER the death sprite animation finishes
   * (typically from an onComplete callback).
   */
  startDeath(): void {
    this._dying = true;
    this._deathAlpha = 1;
    this._animDirty = true;
  }

  /** Reset all animation state — used before spawning a new instance. */
  resetState(): void {
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
   * @param dt — delta time in seconds
   */
  update(dt: number): void {
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
   *
   * When the current animation's frame size differs from idle (e.g. attack
   * sprites on a wider canvas), the destination rect is scaled proportionally
   * so the sprite keeps correct proportions while feet stay on the ground.
   */
  draw(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, dpr: number): void {
    if (!this._visible || !this.engine.loaded) return;

    const s = this._scale;
    const baseW = this._baseW * dpr * 1.56 * s;
    const baseH = this._baseH * dpr * 1.56 * s;

    // Scale destination rect if current frame differs from idle frame size.
    // This keeps attack sprites (often larger canvas) correctly proportioned.
    let w = baseW;
    let h = baseH;
    const idleSize = this.engine.getAnimFrameSize("idle");
    const curSize = this.engine.getFrameSize();
    if (idleSize && curSize && (curSize.w !== idleSize.w || curSize.h !== idleSize.h)) {
      w = baseW * (curSize.w / idleSize.w);
      h = baseH * (curSize.h / idleSize.h);
    }

    // Resolve X position
    let x: number;
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

    // Y: anchor to ground line, shift down by empty space below feet.
    // Uses baseH for ground-line calculation so feet stay pinned regardless
    // of current animation frame size.
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
