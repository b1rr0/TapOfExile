/**
 * ProjectileLayer - renders animated skill effects on the battle canvas.
 *
 * Supports multiple sprite types (e.g. fireball, sword_throw) and 4 render modes:
 *   - projectile:     flies from hero to enemy
 *   - spawn_at_hero:  appears at hero, plays once, disappears
 *   - spawn_at_enemy: appears at enemy, plays once, disappears
 *   - fullscreen:     covers the entire canvas, plays once, disappears
 *
 * Render metadata is read from the JSON atlas `meta.skill` section.
 */

import type { SkillRenderType, SkillRenderMeta } from "@shared/active-skills.js";

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpriteData {
  frames: FrameRect[];
  img: HTMLImageElement;
  fps: number;
  drawW: number;
  drawH: number;
  skillMeta: SkillRenderMeta | null;
}

interface ActiveProjectile {
  spriteKey: string;
  renderType: SkillRenderType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsed: number;
  duration: number;
  frameIndex: number;
  frameElapsed: number;
  onImpact: (() => void) | null;
  playOnce: boolean;
  /** Frame index where impact phase starts (0 = no impact phase). */
  impactFrame: number;
  /** Whether onImpact was already fired (for two-phase projectiles). */
  impactFired: boolean;
  /** Alpha opacity (0-1). Looping effects render semi-transparent. */
  alpha: number;
  /** Unique tag for looping effects - used to remove by ID. */
  loopTag?: string;
}

export class ProjectileLayer {
  private _sprites = new Map<string, SpriteData>();
  private _projectiles: ActiveProjectile[] = [];

  constructor() {}

  /**
   * Load a sprite atlas JSON + PNG image and register it under a key.
   * `drawW`/`drawH` are optional - if omitted, they are read from `meta.skill` in the JSON.
   */
  async load(key: string, jsonPath: string, drawW?: number, drawH?: number): Promise<void> {
    try {
      const resp = await fetch(jsonPath);
      const data = await resp.json();

      const frames: FrameRect[] = [];
      const rawFrames = Array.isArray(data.frames)
        ? data.frames
        : Object.values(data.frames);

      for (const f of rawFrames as any[]) {
        const rect = f.frame || f;
        frames.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      }

      // Derive FPS from duration if available
      let fps = 12;
      const firstDuration = (rawFrames[0] as any)?.duration;
      if (firstDuration && firstDuration > 0) {
        fps = Math.round(1000 / firstDuration);
      }

      // Parse skill metadata from meta.skill
      let skillMeta: SkillRenderMeta | null = null;
      if (data.meta?.skill) {
        const s = data.meta.skill;
        skillMeta = {
          renderType: s.renderType || "projectile",
          renderDurationMs: s.renderDurationMs || 800,
          drawW: s.drawW || 100,
          drawH: s.drawH || 100,
          impactFrame: s.impactFrame || undefined,
        };
      }

      const finalDrawW = drawW ?? skillMeta?.drawW ?? 100;
      const finalDrawH = drawH ?? skillMeta?.drawH ?? 100;

      // Load image
      const imgPath = jsonPath.replace(/[^/]+$/, "") + (data.meta?.image || "");
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgPath;
      });

      this._sprites.set(key, { frames, img, fps, drawW: finalDrawW, drawH: finalDrawH, skillMeta });
    } catch (err) {
      console.warn(`[ProjectileLayer] Failed to load "${key}":`, err);
    }
  }

  /** Whether there are active projectiles (for dirty-flag rendering). */
  get hasActive(): boolean {
    return this._projectiles.length > 0;
  }

  /** Get the parsed skill render metadata for a loaded sprite. */
  getSkillMeta(key: string): SkillRenderMeta | null {
    return this._sprites.get(key)?.skillMeta ?? null;
  }

  /**
   * Extract the first frame of a loaded sprite as a small canvas (for use as icon).
   * Returns null if the sprite isn't loaded.
   */
  getIcon(key: string, size: number = 28): HTMLCanvasElement | null {
    const sprite = this._sprites.get(key);
    if (!sprite || sprite.frames.length === 0) return null;

    const frame = sprite.frames[Math.min(1, sprite.frames.length - 1)];
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const srcAspect = frame.w / frame.h;
    let dw: number, dh: number;
    if (srcAspect > 1) {
      dw = size;
      dh = size / srcAspect;
    } else {
      dh = size;
      dw = size * srcAspect;
    }
    const dx = (size - dw) / 2;
    const dy = (size - dh) / 2;

    ctx.drawImage(sprite.img, frame.x, frame.y, frame.w, frame.h, dx, dy, dw, dh);
    return canvas;
  }

  /**
   * Launch a new skill effect.
   * Render type and duration are read from the sprite's metadata.
   * @param spriteKey - which loaded sprite to use
   * @param startX - hero X in canvas pixels (DPR-scaled)
   * @param startY - hero Y in canvas pixels
   * @param endX - enemy X in canvas pixels
   * @param endY - enemy Y in canvas pixels
   * @param onImpact - called when the effect finishes
   * @param durationOverride - explicit duration in seconds (overrides metadata)
   */
  launch(
    spriteKey: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    onImpact: (() => void) | null = null,
    durationOverride?: number,
  ): void {
    const sprite = this._sprites.get(spriteKey);
    if (!sprite) return;

    const meta = sprite.skillMeta;
    const renderType: SkillRenderType = meta?.renderType ?? "projectile";

    let duration: number;
    if (durationOverride !== undefined) {
      duration = durationOverride;
    } else if (meta?.renderDurationMs) {
      duration = meta.renderDurationMs / 1000;
    } else {
      duration = 0.8;
    }

    const isLooping = renderType === "looping_at_hero" || renderType === "looping_at_enemy";

    this._projectiles.push({
      spriteKey,
      renderType,
      startX,
      startY,
      endX,
      endY,
      elapsed: 0,
      duration,
      frameIndex: 0,
      frameElapsed: 0,
      onImpact,
      playOnce: !isLooping && renderType !== "projectile",
      impactFrame: meta?.impactFrame ?? 0,
      impactFired: false,
      alpha: isLooping ? (renderType === "looping_at_hero" ? 0.6 : 0.5) : 1.0,
    });
  }

  /**
   * Launch a looping effect (buff/debuff) tied to a unique tag.
   * If an effect with the same tag exists, its duration is refreshed.
   */
  launchLooping(
    spriteKey: string,
    tag: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number,
  ): void {
    // Refresh existing effect
    const existing = this._projectiles.find(p => p.loopTag === tag);
    if (existing) {
      existing.elapsed = 0;
      existing.duration = durationMs / 1000;
      return;
    }

    const sprite = this._sprites.get(spriteKey);
    if (!sprite) return;

    const meta = sprite.skillMeta;
    const renderType: SkillRenderType = meta?.renderType ?? "looping_at_hero";
    const isHero = renderType === "looping_at_hero";

    this._projectiles.push({
      spriteKey,
      renderType,
      startX,
      startY,
      endX,
      endY,
      elapsed: 0,
      duration: durationMs / 1000,
      frameIndex: 0,
      frameElapsed: 0,
      onImpact: null,
      playOnce: false,
      impactFrame: 0,
      impactFired: false,
      alpha: isHero ? 0.6 : 0.5,
      loopTag: tag,
    });
  }

  /**
   * Remove all looping effects with monsterIndex tag (called on monster death).
   */
  clearEnemyEffects(): void {
    this._projectiles = this._projectiles.filter(
      p => p.renderType !== "looping_at_enemy",
    );
  }

  /**
   * Advance all active effects.
   * @param dt - delta time in seconds
   */
  update(dt: number): void {
    if (this._projectiles.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this._projectiles.length; i++) {
      const p = this._projectiles[i];
      const sprite = this._sprites.get(p.spriteKey);
      if (!sprite) { toRemove.push(i); continue; }

      p.elapsed += dt;
      p.frameElapsed += dt;

      const frameInterval = 1 / sprite.fps;
      const totalFrames = sprite.frames.length;

      if (p.renderType === "looping_at_hero" || p.renderType === "looping_at_enemy") {
        // Looping effect: cycle all frames, remove when duration expires
        if (p.frameElapsed >= frameInterval) {
          p.frameElapsed -= frameInterval;
          p.frameIndex = (p.frameIndex + 1) % totalFrames;
        }
        if (p.elapsed >= p.duration) {
          toRemove.push(i);
        }
      } else if (p.impactFrame > 0) {
        // Two-phase projectile: flight → impact
        const flightDuration = (p.impactFrame / totalFrames) * p.duration;

        if (p.elapsed < flightDuration) {
          // Phase 1 - flight: loop frames 0..impactFrame-1
          if (p.frameElapsed >= frameInterval) {
            p.frameElapsed -= frameInterval;
            p.frameIndex = (p.frameIndex + 1) % p.impactFrame;
          }
        } else {
          // Phase 2 - impact at target
          if (!p.impactFired) {
            p.impactFired = true;
            if (p.onImpact) p.onImpact();
            p.frameIndex = p.impactFrame;
            p.frameElapsed = 0;
          } else if (p.frameElapsed >= frameInterval) {
            p.frameElapsed -= frameInterval;
            if (p.frameIndex < totalFrames - 1) {
              p.frameIndex++;
            }
          }
          // Remove when last frame played and total duration elapsed
          if (p.frameIndex >= totalFrames - 1 && p.elapsed >= p.duration) {
            toRemove.push(i);
          }
        }
      } else if (p.playOnce) {
        // Non-projectile: advance frame, clamp at last
        if (p.frameElapsed >= frameInterval) {
          p.frameElapsed -= frameInterval;
          if (p.frameIndex < totalFrames - 1) {
            p.frameIndex++;
          }
        }
        const onLastFrame = p.frameIndex >= totalFrames - 1;
        if ((onLastFrame && p.elapsed >= p.duration) || p.elapsed >= p.duration * 2) {
          if (p.onImpact) p.onImpact();
          toRemove.push(i);
        }
      } else {
        // Standard projectile: loop all frames, remove on duration
        if (p.frameElapsed >= frameInterval) {
          p.frameElapsed -= frameInterval;
          p.frameIndex = (p.frameIndex + 1) % totalFrames;
        }
        if (p.elapsed >= p.duration) {
          if (p.onImpact) p.onImpact();
          toRemove.push(i);
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this._projectiles.splice(toRemove[i], 1);
    }
  }

  /**
   * Draw all active effects on the canvas.
   * @param ctx - canvas 2D context
   * @param dpr - device pixel ratio
   * @param canvasW - full canvas width (DPR-scaled), needed for fullscreen type
   * @param canvasH - full canvas height (DPR-scaled), needed for fullscreen type
   */
  draw(ctx: CanvasRenderingContext2D, dpr: number = 1, canvasW?: number, canvasH?: number): void {
    if (this._projectiles.length === 0) return;

    ctx.imageSmoothingEnabled = false;

    for (const p of this._projectiles) {
      const sprite = this._sprites.get(p.spriteKey);
      if (!sprite) continue;

      const frame = sprite.frames[p.frameIndex];
      if (!frame) continue;

      let x: number, y: number, w: number, h: number;

      switch (p.renderType) {
        case "projectile": {
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;

          if (p.impactFrame > 0) {
            const flightDuration = (p.impactFrame / sprite.frames.length) * p.duration;
            if (p.elapsed < flightDuration) {
              // Flight phase: interpolate position
              const t = Math.min(p.elapsed / flightDuration, 1);
              const ease = 1 - (1 - t) * (1 - t);
              x = p.startX + (p.endX - p.startX) * ease;
              y = p.startY + (p.endY - p.startY) * ease;
            } else {
              // Impact phase: stay at target
              x = p.endX;
              y = p.endY;
            }
          } else {
            const t = Math.min(p.elapsed / p.duration, 1);
            const ease = 1 - (1 - t) * (1 - t);
            x = p.startX + (p.endX - p.startX) * ease;
            y = p.startY + (p.endY - p.startY) * ease;
          }
          break;
        }

        case "spawn_at_hero": {
          x = p.startX;
          y = p.startY;
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;
          break;
        }

        case "spawn_at_enemy": {
          x = p.endX;
          y = p.endY;
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;
          break;
        }

        case "looping_at_hero": {
          x = p.startX;
          y = p.startY;
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;
          break;
        }

        case "looping_at_enemy": {
          x = p.endX;
          y = p.endY;
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;
          break;
        }

        case "fullscreen": {
          if (canvasW && canvasH) {
            x = canvasW / 2;
            y = canvasH / 2;
            const aspect = frame.w / frame.h;
            const cAspect = canvasW / canvasH;
            if (aspect > cAspect) {
              h = canvasH;
              w = h * aspect;
            } else {
              w = canvasW;
              h = w / aspect;
            }
          } else {
            x = p.startX;
            y = p.startY;
            w = sprite.drawW * dpr;
            h = sprite.drawH * dpr;
          }
          break;
        }

        default: {
          // Fallback: treat unknown renderType as spawn_at_enemy
          x = p.endX;
          y = p.endY;
          w = sprite.drawW * dpr;
          h = sprite.drawH * dpr;
          break;
        }
      }

      const needsAlpha = p.alpha < 1;
      if (needsAlpha) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
      }

      ctx.drawImage(
        sprite.img,
        frame.x, frame.y, frame.w, frame.h,
        x! - w! / 2, y! - h! / 2, w!, h!,
      );

      if (needsAlpha) {
        ctx.restore();
      }
    }
  }

  destroy(): void {
    this._projectiles = [];
    this._sprites.clear();
  }
}
