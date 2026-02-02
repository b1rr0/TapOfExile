import { Inventory } from "../ui/inventory.js";
import { IS_TESTING } from "../main.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { getCharacterClass } from "../data/character-classes.js";
import { SpriteEngine } from "../ui/sprite-engine.js";

/**
 * HideoutScene — home hub screen.
 *
 * Shows player level + gold, hero canvas sprite, character info,
 * and navigation buttons (Map, Inventory, Switch Character).
 *
 * Lifecycle: mount(params) / unmount()
 */
export class HideoutScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this.inventory = null;
    this._goldHandler = null;
    this._levelHandler = null;
    this._heroEngine = null;
    this._heroRaf = null;
  }

  mount(params = {}) {
    const player = this.state.data.player;
    const char = this.state.getActiveCharacter();
    const cls = char ? getCharacterClass(char.classId) : null;

    this.container.innerHTML = `
      <div class="hideout">
        <!-- Top bar — scene title only -->
        <div class="hideout-topbar">
          <span class="hideout-topbar__title">Hideout</span>
        </div>

        <!-- Hero area -->
        <div class="hideout-hero">
          <canvas class="hideout-hero__canvas" id="hideout-hero-canvas"></canvas>
        </div>

        <!-- Character info -->
        ${char ? `
        <div class="hideout-char-info">
          <div class="hideout-char-info__name">${char.nickname}</div>
          <div class="hideout-char-info__class">${cls ? cls.icon + " " + cls.name : char.classId}</div>
        </div>
        ` : ""}

        <!-- Bottom section: XP bar + level above nav -->
        <div class="hideout-bottom">
          <div class="bottom-xp-row">
            <span id="hideout-level" class="bottom-level-display">Lv.${player.level}</span>
            <div class="xp-bar bottom-xp-bar" id="hideout-xp-bar">
              <div class="xp-bar__fill" id="hideout-xp-fill" style="width:${player.xpToNext > 0 ? (player.xp / player.xpToNext * 100) : 0}%"></div>
              <div class="xp-bar__text" id="hideout-xp-text">${player.xp} / ${player.xpToNext}</div>
            </div>
          </div>
          <div class="hideout-nav">
            <button class="hideout-btn hideout-btn--map" id="hideout-map-btn">
              <span class="hideout-btn__icon">&#x1F5FA;</span>
              <span class="hideout-btn__label">Map</span>
            </button>
            <button class="hideout-btn hideout-btn--inventory" id="hideout-inv-btn">
              <span class="hideout-btn__icon">&#x1F392;</span>
              <span class="hideout-btn__label">Inventory</span>
            </button>
            <button class="hideout-btn hideout-btn--shop" id="hideout-shop-btn">
              <span class="hideout-btn__icon">&#x1F455;</span>
              <span class="hideout-btn__label">Skins</span>
            </button>
            <button class="hideout-btn hideout-btn--switch" id="hideout-switch-btn">
              <span class="hideout-btn__icon">&#x1F464;</span>
              <span class="hideout-btn__label">Heroes</span>
            </button>
            ${IS_TESTING ? `
            <button class="hideout-btn hideout-btn--storybook" id="hideout-sb-btn">
              <span class="hideout-btn__icon">&#x1F3A8;</span>
              <span class="hideout-btn__label">Storybook</span>
            </button>
            ` : ""}
          </div>
        </div>
      </div>
    `;

    // Inventory overlay (attached to hideout root)
    const hideoutEl = this.container.querySelector(".hideout");
    this.inventory = new Inventory(hideoutEl, this.events);

    // Wire buttons
    this.container.querySelector("#hideout-map-btn").addEventListener("click", () => {
      if (this.sceneManager) {
        this.sceneManager.switchTo("map");
      }
    });

    this.container.querySelector("#hideout-inv-btn").addEventListener("click", () => {
      if (this.inventory) this.inventory.toggle();
    });

    this.container.querySelector("#hideout-shop-btn").addEventListener("click", () => {
      this.sceneManager.switchTo("skinShop");
    });

    this.container.querySelector("#hideout-switch-btn").addEventListener("click", () => {
      this.sceneManager.switchTo("characterSelect");
    });

    const sbBtn = this.container.querySelector("#hideout-sb-btn");
    if (sbBtn) {
      sbBtn.addEventListener("click", () => this.sceneManager.switchTo("storybook"));
    }

    // Live-update level & XP (gold is handled by Inventory)
    this._goldHandler = null; // kept for unmount safety
    this._levelHandler = (data) => {
      const el = this.container.querySelector("#hideout-level");
      if (el) el.textContent = `Lv.${data.level}`;
      this._updateXpBar();
    };
    this._xpHandler = () => {
      this._updateXpBar();
    };
    this.events.on("levelUp", this._levelHandler);
    this.events.on("xpChanged", this._xpHandler);

    // Load hero sprite
    this._loadHeroSprite();
  }

  _updateXpBar() {
    const p = this.state.data.player;
    if (!p) return;
    const pct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    const fill = this.container.querySelector("#hideout-xp-fill");
    const text = this.container.querySelector("#hideout-xp-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = `${p.xp} / ${p.xpToNext}`;
  }

  /* ── Canvas hero sprite ──────────────────────────────── */

  async _loadHeroSprite() {
    const char = this.state.getActiveCharacter();
    if (!char) return;

    const skin = getHeroSkin(char.skinId);
    if (!skin) return;

    const canvas = this.container.querySelector("#hideout-hero-canvas");
    if (!canvas) return;

    // Size canvas to hero area
    const heroArea = this.container.querySelector(".hideout-hero");
    const rect = heroArea.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    this._heroEngine = new SpriteEngine({
      basePath: skin.basePath,
      animations: { idle: skin.animations.idle },
    });

    try {
      await this._heroEngine.load();
      this._heroEngine.play("idle");
      this._heroCtx = canvas.getContext("2d");
      this._heroCanvas = canvas;
      this._heroSkin = skin;
      this._heroDpr = dpr;
      this._startHeroTick();
    } catch (err) {
      console.warn("[HideoutScene] Failed to load hero sprite", err);
    }
  }

  _startHeroTick() {
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      this._heroEngine.update(dt);
      if (this._heroEngine.needsRedraw) {
        this._heroEngine.needsRedraw = false;
        this._drawHero();
      }

      this._heroRaf = requestAnimationFrame(tick);
    };

    this._heroRaf = requestAnimationFrame(tick);
  }

  _drawHero() {
    const ctx = this._heroCtx;
    const w = this._heroCanvas.width;
    const h = this._heroCanvas.height;
    const skin = this._heroSkin;

    ctx.clearRect(0, 0, w, h);

    const frameW = skin.defaultSize.w;
    const frameH = skin.defaultSize.h;
    const maxH = h * 0.65;
    const scale = Math.min(maxH / frameH, (w * 0.5) / frameW);
    const dw = frameW * scale;
    const dh = frameH * scale;
    const dx = (w - dw) / 2;
    const dy = h - dh - h * 0.08;

    this._heroEngine.drawFrame(ctx, dx, dy, dw, dh, false);
  }

  /* ── Cleanup ─────────────────────────────────────────── */

  unmount() {
    if (this._heroRaf) {
      cancelAnimationFrame(this._heroRaf);
      this._heroRaf = null;
    }
    if (this._heroEngine) {
      this._heroEngine.destroy();
      this._heroEngine = null;
    }
    if (this._goldHandler) {
      this.events.off("goldChanged", this._goldHandler);
      this._goldHandler = null;
    }
    if (this._levelHandler) {
      this.events.off("levelUp", this._levelHandler);
      this._levelHandler = null;
    }
    if (this._xpHandler) {
      this.events.off("xpChanged", this._xpHandler);
      this._xpHandler = null;
    }
    if (this.inventory) {
      this.inventory.destroy();
      this.inventory = null;
    }
    this.container.innerHTML = "";
  }
}
