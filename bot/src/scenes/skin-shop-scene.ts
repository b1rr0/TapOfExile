import { getCharacterClass } from "../data/character-classes.js";
import { getHeroSkin, getSkinsForClass } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import { CLASS_DEFS } from "@shared/class-stats";
import { B } from "@shared/balance";
import type { SharedDeps, SkinConfig } from "../types.js";

/** Set of default skin IDs (one per class, always free). */
const DEFAULT_SKINS = new Set(
  Object.values(CLASS_DEFS).map((c: any) => c.skinId as string),
);

/**
 * SkinShopScene - skin selection screen with paid skins.
 *
 * Default class skins are free. All others cost SKIN_PRICE_SHARDS.
 * Purchased skins are stored on player.purchasedSkins.
 */
export class SkinShopScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  _engines: { engine: SpriteEngine; canvas: HTMLCanvasElement; skin: SkinConfig }[];
  _raf: number | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._engines = [];
    this._raf = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    const char = this.state.getActiveCharacter();
    if (!char) {
      this.sceneManager.switchTo("hideout");
      return;
    }

    const cls = getCharacterClass(char.classId);
    const skins: SkinConfig[] = getSkinsForClass(char.classId);
    const gd = this.state.data;
    const purchased: string[] = gd.purchasedSkins || [];
    const shards = gd.shards || "0";

    this.container.innerHTML = `
      <div class="skin-shop">
        <div class="skin-shop__header">
          <span class="skin-shop__shards">&#x1F48E; <span id="ss-shards">${shards}</span></span>
          <h2 class="skin-shop__title">Skins</h2>
          <button class="scene-close-btn" id="ss-back">&times;</button>
        </div>

        <div class="skin-shop__info">
          <span class="skin-shop__class">${cls ? cls.icon + " " + cls.name : char.classId}</span>
        </div>

        <div class="skin-shop__grid" id="ss-grid">
          ${skins.map(skin => {
            const isEquipped = char.skinId === skin.id;
            const isFree = DEFAULT_SKINS.has(skin.id);
            const isOwned = isFree || purchased.includes(skin.id);

            let statusHtml: string;
            if (isEquipped) {
              statusHtml = '<span class="skin-card__badge">Equipped</span>';
            } else if (isOwned) {
              statusHtml = `<button class="skin-card__select-btn" data-skin="${skin.id}">Select</button>`;
            } else {
              statusHtml = `<button class="skin-card__buy-btn" data-skin="${skin.id}">${B.SKIN_PRICE_SHARDS} &#x1F48E;</button>`;
            }

            return `
              <div class="skin-card ${isEquipped ? "skin-card--equipped" : ""} ${!isOwned ? "skin-card--locked" : ""}" data-skin="${skin.id}">
                <canvas class="skin-card__preview" data-skin="${skin.id}"></canvas>
                <div class="skin-card__name">${skin.name}</div>
                <div class="skin-card__status">${statusHtml}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    // Wire back button
    (this.container.querySelector("#ss-back") as HTMLButtonElement).addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    // Wire select buttons (owned skins)
    this.container.querySelectorAll(".skin-card__select-btn").forEach(btn => {
      btn.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const skinId = (btn as HTMLElement).dataset.skin!;
        try {
          await this.state.setSkin(skinId);
          this._cleanup();
          this.container.innerHTML = "";
          this.mount();
        } catch (err) {
          console.error("[SkinShop] Failed to change skin:", err);
        }
      });
    });

    // Wire buy buttons (locked skins - purchase + equip)
    this.container.querySelectorAll(".skin-card__buy-btn").forEach(btn => {
      btn.addEventListener("click", async (e: Event) => {
        e.stopPropagation();
        const skinId = (btn as HTMLElement).dataset.skin!;
        try {
          // setSkin handles purchase + equip on server side
          await this.state.setSkin(skinId);
          // Refresh to get updated shards & purchasedSkins from server
          await this.state.refreshState();
          this._cleanup();
          this.container.innerHTML = "";
          this.mount();
        } catch (err: any) {
          const msg = err?.message || "Purchase failed";
          console.error("[SkinShop] Failed to buy skin:", msg);
          alert(msg);
        }
      });
    });

    // Load sprite previews
    this._loadPreviews();
  }

  /* -- Sprite previews ------------------------------------ */

  async _loadPreviews(): Promise<void> {
    const canvases = this.container.querySelectorAll(".skin-card__preview") as NodeListOf<HTMLCanvasElement>;

    for (const canvas of canvases) {
      const skinId = canvas.dataset.skin!;
      const skin = getHeroSkin(skinId);
      if (!skin) continue;

      const engine = new SpriteEngine({
        basePath: skin.basePath,
        animations: { idle: skin.animations.idle },
      });

      try {
        await engine.load();
        engine.play("idle");
        this._engines.push({ engine, canvas, skin });
      } catch (err) {
        console.warn(`[SkinShop] Failed to load preview for ${skinId}`, err);
      }
    }

    this._sizeCanvases();
    this._startTick();
  }

  _sizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
  }

  _startTick(): void {
    let last = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      for (const { engine, canvas, skin } of this._engines) {
        engine.update(dt);
        if (engine.needsRedraw) {
          engine.needsRedraw = false;
          const ctx = canvas.getContext("2d")!;
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.imageSmoothingEnabled = false;

          const frameW = skin.defaultSize.w;
          const frameH = skin.defaultSize.h;
          const scale = Math.min((h * 0.8) / frameH, (w * 0.8) / frameW);
          const dw = frameW * scale;
          const dh = frameH * scale;
          const dx = (w - dw) / 2;
          const dy = h - dh - h * 0.05;

          engine.drawFrame(ctx, dx, dy, dw, dh, false);
        }
      }

      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  /* -- Cleanup -------------------------------------------- */

  _cleanup(): void {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    for (const { engine } of this._engines) {
      engine.destroy();
    }
    this._engines = [];
  }

  unmount(): void {
    this._cleanup();
    this.container.innerHTML = "";
  }
}
