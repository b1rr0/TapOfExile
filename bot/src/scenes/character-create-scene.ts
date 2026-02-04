import { listCharacterClasses } from "../data/character-classes.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import type { SharedDeps, SkinConfig } from "../types.js";

/**
 * CharacterCreateScene — nickname input + class selection.
 *
 * Lifecycle: mount(params) / unmount()
 */
export class CharacterCreateScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  _engines: { engine: SpriteEngine; canvas: HTMLCanvasElement; skin: SkinConfig }[];
  _previewEngine: SpriteEngine | null;
  _previewCanvas: HTMLCanvasElement | null;
  _previewSkin: SkinConfig | null;
  _raf: number | null;

  _selectedClassId: string | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._engines = [];     // SpriteEngine per class card
    this._previewEngine = null;
    this._previewCanvas = null;
    this._previewSkin = null;
    this._raf = null;

    this._selectedClassId = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    const classes = listCharacterClasses();
    const hasChars = this.state.hasCharacters();

    this.container.innerHTML = `
      <div class="char-create">
        <div class="char-create__header">
          ${hasChars ? `<button class="char-create__back" id="cc-back">&larr;</button>` : ""}
          <h2 class="char-create__title">Create Hero</h2>
        </div>

        <div class="char-create__section">
          <label class="char-create__label">Nickname</label>
          <input type="text" class="char-create__input" id="cc-nickname"
                 maxlength="16" placeholder="Enter name..." autocomplete="off" />
        </div>

        <div class="char-create__section">
          <label class="char-create__label">Choose Class</label>
          <div class="char-create__classes" id="cc-classes">
            ${classes.map(c => `
              <div class="class-card" data-class="${c.id}">
                <canvas class="class-card__preview" data-skin="${c.skinId}"></canvas>
                <div class="class-card__name">${c.icon} ${c.name}</div>
                <div class="class-card__desc">${c.description}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="char-create__preview-area">
          <canvas class="char-create__big-preview" id="cc-preview"></canvas>
        </div>

        <button class="char-create__confirm" id="cc-confirm" disabled>Create</button>
      </div>
    `;

    // Wire back button
    const backBtn = this.container.querySelector("#cc-back") as HTMLButtonElement | null;
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.sceneManager.switchTo("characterSelect");
      });
    }

    // Wire class card clicks
    const classCards = this.container.querySelectorAll(".class-card") as NodeListOf<HTMLElement>;
    classCards.forEach(card => {
      card.addEventListener("click", () => {
        // Deselect all
        classCards.forEach(c => c.classList.remove("class-card--selected"));
        // Select this one
        card.classList.add("class-card--selected");
        this._selectedClassId = card.dataset.class ?? null;
        this._updateConfirmState();
        this._loadBigPreview(card.dataset.class!);
      });
    });

    // Wire nickname input
    const nicknameInput = this.container.querySelector("#cc-nickname") as HTMLInputElement;
    nicknameInput.addEventListener("input", () => this._updateConfirmState());

    // Wire confirm button
    (this.container.querySelector("#cc-confirm") as HTMLButtonElement).addEventListener("click", () => {
      const nickname = nicknameInput.value.trim();
      if (!nickname || !this._selectedClassId) return;

      this.state.createCharacter(nickname, this._selectedClassId);
      this.sceneManager.switchTo("hideout");
    });

    // Load sprite previews for class cards
    this._loadClassPreviews();
  }

  /* -- Sprite previews for class cards -------------------- */

  async _loadClassPreviews(): Promise<void> {
    const canvases = this.container.querySelectorAll(".class-card__preview") as NodeListOf<HTMLCanvasElement>;

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
        console.warn(`[CharCreate] Failed to load preview for ${skinId}`, err);
      }
    }

    // Size canvases and start tick
    this._sizeCardCanvases();
    this._startTick();
  }

  _sizeCardCanvases(): void {
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
  }

  /* -- Big preview for selected class --------------------- */

  async _loadBigPreview(classId: string): Promise<void> {
    // Destroy old preview
    if (this._previewEngine) {
      this._previewEngine.destroy();
      this._previewEngine = null;
    }

    const cls = listCharacterClasses().find(c => c.id === classId);
    if (!cls) return;

    const skin = getHeroSkin(cls.skinId);
    if (!skin) return;

    const canvas = this.container.querySelector("#cc-preview") as HTMLCanvasElement | null;
    if (!canvas) return;

    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const engine = new SpriteEngine({
      basePath: skin.basePath,
      animations: { idle: skin.animations.idle },
    });

    try {
      await engine.load();
      engine.play("idle");
      this._previewEngine = engine;
      this._previewCanvas = canvas;
      this._previewSkin = skin;
    } catch (err) {
      console.warn(`[CharCreate] Failed to load big preview for ${cls.skinId}`, err);
    }
  }

  /* -- Tick loop ------------------------------------------ */

  _startTick(): void {
    let last = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      // Update small class-card canvases
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

      // Update big preview
      if (this._previewEngine && this._previewCanvas) {
        this._previewEngine.update(dt);
        if (this._previewEngine.needsRedraw) {
          this._previewEngine.needsRedraw = false;
          const canvas = this._previewCanvas;
          const ctx = canvas.getContext("2d")!;
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const skin = this._previewSkin!;
          const frameW = skin.defaultSize.w;
          const frameH = skin.defaultSize.h;
          const scale = Math.min(h * 0.7 / frameH, w * 0.6 / frameW);
          const dw = frameW * scale;
          const dh = frameH * scale;
          const dx = (w - dw) / 2;
          const dy = h - dh - h * 0.08;
          this._previewEngine.drawFrame(ctx, dx, dy, dw, dh, false);
        }
      }

      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  /* -- Confirm state -------------------------------------- */

  _updateConfirmState(): void {
    const nickname = (this.container.querySelector("#cc-nickname") as HTMLInputElement | null)?.value.trim();
    const btn = this.container.querySelector("#cc-confirm") as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = !nickname || !this._selectedClassId;
    }
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

    if (this._previewEngine) {
      this._previewEngine.destroy();
      this._previewEngine = null;
    }

    this._selectedClassId = null;
    this.container.innerHTML = "";
  }
}
