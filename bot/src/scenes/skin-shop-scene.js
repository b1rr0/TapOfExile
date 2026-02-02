import { getCharacterClass } from "../data/character-classes.js";
import { getHeroSkin, getSkinsForClass } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";

/**
 * SkinShopScene — skin selection screen.
 *
 * Shows all available skins for the active character's class.
 * Lets the player equip a different skin (free selection).
 *
 * Lifecycle: mount(params) / unmount()
 */
export class SkinShopScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._engines = []; // { engine, canvas, skin }
    this._raf = null;
  }

  mount(params = {}) {
    const char = this.state.getActiveCharacter();
    if (!char) {
      this.sceneManager.switchTo("hideout");
      return;
    }

    const cls = getCharacterClass(char.classId);
    const skins = getSkinsForClass(char.classId);

    this.container.innerHTML = `
      <div class="skin-shop">
        <div class="skin-shop__header">
          <button class="skin-shop__back" id="ss-back">&larr;</button>
          <h2 class="skin-shop__title">Skins</h2>
        </div>

        <div class="skin-shop__info">
          <span class="skin-shop__class">${cls ? cls.icon + " " + cls.name : char.classId}</span>
        </div>

        <div class="skin-shop__grid" id="ss-grid">
          ${skins.map(skin => {
            const isEquipped = char.skinId === skin.id;
            return `
              <div class="skin-card ${isEquipped ? "skin-card--equipped" : ""}" data-skin="${skin.id}">
                <canvas class="skin-card__preview" data-skin="${skin.id}"></canvas>
                <div class="skin-card__name">${skin.name}</div>
                <div class="skin-card__status">
                  ${isEquipped
                    ? '<span class="skin-card__badge">Equipped</span>'
                    : `<button class="skin-card__select-btn" data-skin="${skin.id}">Select</button>`
                  }
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    // Wire back button
    this.container.querySelector("#ss-back").addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    // Wire select buttons
    this.container.querySelectorAll(".skin-card__select-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const skinId = btn.dataset.skin;
        this.state.setSkin(skinId);
        // Re-mount to refresh UI
        this._cleanup();
        this.container.innerHTML = "";
        this.mount();
      });
    });

    // Load sprite previews
    this._loadPreviews();
  }

  /* ── Sprite previews ───────────────────────────────────── */

  async _loadPreviews() {
    const canvases = this.container.querySelectorAll(".skin-card__preview");

    for (const canvas of canvases) {
      const skinId = canvas.dataset.skin;
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

  _sizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
  }

  _startTick() {
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      for (const { engine, canvas, skin } of this._engines) {
        engine.update(dt);
        if (engine.needsRedraw) {
          engine.needsRedraw = false;
          const ctx = canvas.getContext("2d");
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

  /* ── Cleanup ───────────────────────────────────────────── */

  _cleanup() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    for (const { engine } of this._engines) {
      engine.destroy();
    }
    this._engines = [];
  }

  unmount() {
    this._cleanup();
    this.container.innerHTML = "";
  }
}
