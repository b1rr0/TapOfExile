import { getCharacterClass } from "../data/character-classes.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import type { SharedDeps, SkinConfig } from "../types.js";

/**
 * CharacterSelectScene — pick an existing character or create a new one.
 *
 * Lifecycle: mount(params) / unmount()
 */
export class CharacterSelectScene {
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
    const characters = this.state.data.characters;
    const activeId = this.state.data.activeCharacterId;

    this.container.innerHTML = `
      <div class="char-select">
        <div class="char-select__header">
          <h2 class="char-select__title">Choose Hero</h2>
        </div>

        <div class="char-select__list" id="char-list">
          ${characters.map((c: any) => {
            const cls = getCharacterClass(c.classId);
            const isActive = c.id === activeId;
            return `
              <div class="char-card ${isActive ? "char-card--active" : ""}" data-id="${c.id}">
                <canvas class="char-card__preview" data-skin="${c.skinId}"></canvas>
                <div class="char-card__info">
                  <div class="char-card__name">${c.nickname}</div>
                  <div class="char-card__class">${cls ? cls.icon + " " + cls.name : c.classId}</div>
                  <div class="char-card__level">Lv. ${c.level}</div>
                  ${c.leagueName ? `<div class="char-card__league">${c.leagueName}</div>` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <button class="char-select__new-btn" id="char-new-btn">+ Create New Hero</button>
      </div>
    `;

    // Wire character card clicks
    const cards = this.container.querySelectorAll(".char-card") as NodeListOf<HTMLElement>;
    cards.forEach(card => {
      card.addEventListener("click", async () => {
        const charId = card.dataset.id;
        try {
          await this.state.setActiveCharacter(charId);
          this.sceneManager.switchTo("hideout");
        } catch (err) {
          console.error("[CharSelect] Failed to activate character:", err);
        }
      });
    });

    // Wire create-new button
    (this.container.querySelector("#char-new-btn") as HTMLButtonElement).addEventListener("click", () => {
      this.sceneManager.switchTo("characterCreate");
    });

    // Load sprite previews
    this._loadPreviews();
  }

  /* -- Sprite previews ------------------------------------ */

  async _loadPreviews(): Promise<void> {
    const canvases = this.container.querySelectorAll(".char-card__preview") as NodeListOf<HTMLCanvasElement>;

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
        console.warn(`[CharSelect] Failed to load preview for ${skinId}`, err);
      }
    }

    this._sizeCanvases();
    this._startTick();
  }

  _sizeCanvases(): void {
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
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

  /* -- Cleanup -------------------------------------------- */

  unmount(): void {
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
