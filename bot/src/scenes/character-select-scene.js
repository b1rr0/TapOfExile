import { getCharacterClass } from "../data/character-classes.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";

/**
 * CharacterSelectScene — pick an existing character or create a new one.
 *
 * Lifecycle: mount(params) / unmount()
 */
export class CharacterSelectScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._engines = [];
    this._raf = null;
  }

  mount(params = {}) {
    const characters = this.state.data.characters;
    const activeId = this.state.data.activeCharacterId;

    this.container.innerHTML = `
      <div class="char-select">
        <div class="char-select__header">
          <h2 class="char-select__title">Choose Hero</h2>
        </div>

        <div class="char-select__list" id="char-list">
          ${characters.map(c => {
            const cls = getCharacterClass(c.classId);
            const isActive = c.id === activeId;
            return `
              <div class="char-card ${isActive ? "char-card--active" : ""}" data-id="${c.id}">
                <canvas class="char-card__preview" data-skin="${c.skinId}"></canvas>
                <div class="char-card__info">
                  <div class="char-card__name">${c.nickname}</div>
                  <div class="char-card__class">${cls ? cls.icon + " " + cls.name : c.classId}</div>
                  <div class="char-card__level">Lv. ${c.level}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <button class="char-select__new-btn" id="char-new-btn">+ Create New Hero</button>
      </div>
    `;

    // Wire character card clicks
    const cards = this.container.querySelectorAll(".char-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        const charId = card.dataset.id;
        this.state.setActiveCharacter(charId);
        this.sceneManager.switchTo("hideout");
      });
    });

    // Wire create-new button
    this.container.querySelector("#char-new-btn").addEventListener("click", () => {
      this.sceneManager.switchTo("characterCreate");
    });

    // Load sprite previews
    this._loadPreviews();
  }

  /* ── Sprite previews ─────────────────────────────────── */

  async _loadPreviews() {
    const canvases = this.container.querySelectorAll(".char-card__preview");

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
        console.warn(`[CharSelect] Failed to load preview for ${skinId}`, err);
      }
    }

    this._sizeCanvases();
    this._startTick();
  }

  _sizeCanvases() {
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
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

          const frameW = skin.defaultSize.w;
          const frameH = skin.defaultSize.h;
          const scale = Math.min(h * 0.85 / frameH, w * 0.85 / frameW);
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

  /* ── Cleanup ─────────────────────────────────────────── */

  unmount() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    for (const { engine } of this._engines) {
      engine.destroy();
    }
    this._engines = [];
    this.container.innerHTML = "";
  }
}
