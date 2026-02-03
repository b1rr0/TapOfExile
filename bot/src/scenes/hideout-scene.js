import { Equipment } from "../ui/equipment.js";
import { ChestPanel } from "../ui/chest-panel.js";
import { IS_TESTING } from "../main.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { getCharacterClass } from "../data/character-classes.js";
import { SpriteEngine } from "../ui/sprite-engine.js";

/**
 * HideoutScene — home hub screen.
 *
 * Top bar: title + Shop dropdown (Skins, Hideouts) + Settings dropdown (Heroes, Storybook).
 * Center: hero canvas sprite + character info.
 * Bottom: XP bar + 4-button nav (Map, Equip, Chest, Market).
 *
 * Lifecycle: mount(params) / unmount()
 */
export class HideoutScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this.equipment = null;
    this.chestPanel = null;
    this._goldHandler = null;
    this._levelHandler = null;
    this._heroEngine = null;
    this._heroRaf = null;
    this._closeDropdowns = null;

    // Cached DOM refs (set in mount)
    this._xpFill = null;
    this._xpText = null;
    this._levelEl = null;
    this._shopDD = null;
    this._settingsDD = null;
    this._shopMenu = null;
    this._settingsMenu = null;
  }

  mount(params = {}) {
    // Check if endgame should be unlocked
    this.state.checkEndgameUnlock();

    const player = this.state.data.player;
    const char = this.state.getActiveCharacter();
    const cls = char ? getCharacterClass(char.classId) : null;

    this.container.innerHTML = `
      <div class="hideout">
        <!-- Top bar — title + Shop / Settings -->
        <div class="hideout-topbar">
          <!-- Shop dropdown -->
          <div class="hideout-topbar__dropdown" id="shop-dropdown">
            <button class="hideout-topbar__btn" id="shop-toggle">
              <span class="hideout-topbar__btn-icon">&#x1F6D2;</span>
              <span class="hideout-topbar__btn-label">Shop</span>
            </button>
            <div class="hideout-dropdown__menu hideout-dropdown--hidden" id="shop-menu">
              <button class="hideout-dropdown__item" data-action="skins">
                <span class="hideout-dropdown__icon">&#x1F455;</span> Skins
              </button>
              <button class="hideout-dropdown__item" data-action="hideouts">
                <span class="hideout-dropdown__icon">&#x1F3E0;</span> Hideouts
              </button>
            </div>
          </div>

          <span class="hideout-topbar__title">Hideout</span>

          <!-- Settings dropdown -->
          <div class="hideout-topbar__dropdown" id="settings-dropdown">
            <button class="hideout-topbar__btn" id="settings-toggle">
              <span class="hideout-topbar__btn-icon">&#x2699;</span>
              <span class="hideout-topbar__btn-label">Settings</span>
            </button>
            <div class="hideout-dropdown__menu hideout-dropdown--hidden" id="settings-menu">
              <button class="hideout-dropdown__item" data-action="heroes">
                <span class="hideout-dropdown__icon">&#x1F464;</span> Heroes
              </button>
              ${IS_TESTING ? `
              <button class="hideout-dropdown__item" data-action="storybook">
                <span class="hideout-dropdown__icon">&#x1F3A8;</span> Storybook
              </button>
              ` : ""}
            </div>
          </div>
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
            <button class="hideout-btn hideout-btn--equipment" id="hideout-equip-btn">
              <span class="hideout-btn__icon">&#x2694;</span>
              <span class="hideout-btn__label">Equip</span>
            </button>
            <button class="hideout-btn hideout-btn--chest" id="hideout-chest-btn">
              <span class="hideout-btn__icon">&#x1F4E6;</span>
              <span class="hideout-btn__label">Chest</span>
            </button>
            <button class="hideout-btn hideout-btn--market" id="hideout-market-btn">
              <span class="hideout-btn__icon">&#x1F4B0;</span>
              <span class="hideout-btn__label">Market</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache DOM refs once
    this._xpFill = this.container.querySelector("#hideout-xp-fill");
    this._xpText = this.container.querySelector("#hideout-xp-text");
    this._levelEl = this.container.querySelector("#hideout-level");
    this._shopDD = this.container.querySelector("#shop-dropdown");
    this._settingsDD = this.container.querySelector("#settings-dropdown");
    this._shopMenu = this.container.querySelector("#shop-menu");
    this._settingsMenu = this.container.querySelector("#settings-menu");

    // Overlays (attached to hideout root)
    const hideoutEl = this.container.querySelector(".hideout");
    this.equipment = new Equipment(hideoutEl, this.events);
    this.chestPanel = new ChestPanel(hideoutEl, this.events, this.state);

    // ── Bottom nav buttons ─────────────────────────────────
    this.container.querySelector("#hideout-map-btn").addEventListener("click", () => {
      if (this.sceneManager) this.sceneManager.switchTo("map");
    });

    this.container.querySelector("#hideout-equip-btn").addEventListener("click", () => {
      if (this.equipment) this.equipment.toggle();
    });

    this.container.querySelector("#hideout-chest-btn").addEventListener("click", () => {
      if (this.chestPanel) this.chestPanel.toggle();
    });

    this.container.querySelector("#hideout-market-btn").addEventListener("click", () => {
      // Market — placeholder, no logic yet
      console.log("[Hideout] Market clicked — not implemented yet");
    });

    // ── Top bar dropdowns ──────────────────────────────────
    this._wireDropdown("shop-toggle", "shop-menu", {
      skins: () => this.sceneManager.switchTo("skinShop"),
      hideouts: () => console.log("[Hideout] Hideouts clicked — not implemented yet"),
    });

    this._wireDropdown("settings-toggle", "settings-menu", {
      heroes: () => this.sceneManager.switchTo("characterSelect"),
      storybook: () => this.sceneManager.switchTo("storybook"),
    });

    // Close dropdowns on any outside click (uses cached refs)
    this._closeDropdowns = (e) => {
      if (this._shopDD && !this._shopDD.contains(e.target)) {
        if (this._shopMenu) this._shopMenu.classList.add("hideout-dropdown--hidden");
      }
      if (this._settingsDD && !this._settingsDD.contains(e.target)) {
        if (this._settingsMenu) this._settingsMenu.classList.add("hideout-dropdown--hidden");
      }
    };
    document.addEventListener("click", this._closeDropdowns);

    // ── Live-update level & XP ─────────────────────────────
    this._goldHandler = null;
    this._levelHandler = (data) => {
      if (this._levelEl) this._levelEl.textContent = `Lv.${data.level}`;
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

  /* ── Dropdown helpers ───────────────────────────────────── */

  _wireDropdown(toggleId, menuId, actions) {
    const toggle = this.container.querySelector(`#${toggleId}`);
    const menu = menuId === "shop-menu" ? this._shopMenu : this._settingsMenu;
    const otherMenu = menuId === "shop-menu" ? this._settingsMenu : this._shopMenu;
    if (!toggle || !menu) return;

    // Toggle menu visibility on button click
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();

      // Close the other menu first (cached ref, no querySelectorAll)
      if (otherMenu) otherMenu.classList.add("hideout-dropdown--hidden");

      menu.classList.toggle("hideout-dropdown--hidden");
    });

    // Wire action items
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".hideout-dropdown__item");
      if (!item) return;

      const action = item.dataset.action;
      if (actions[action]) {
        actions[action]();
      }

      // Close menu after action
      menu.classList.add("hideout-dropdown--hidden");
    });
  }

  _hideMenu(menuId) {
    const menu = menuId === "shop-menu" ? this._shopMenu : this._settingsMenu;
    if (menu) menu.classList.add("hideout-dropdown--hidden");
  }

  /* ── XP bar ─────────────────────────────────────────────── */

  _updateXpBar() {
    const p = this.state.data.player;
    if (!p) return;
    const pct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    if (this._xpFill) this._xpFill.style.width = pct + "%";
    if (this._xpText) this._xpText.textContent = `${p.xp} / ${p.xpToNext}`;
  }

  /* ── Canvas hero sprite ──────────────────────────────────── */

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

  /* ── Cleanup ─────────────────────────────────────────────── */

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
    if (this._closeDropdowns) {
      document.removeEventListener("click", this._closeDropdowns);
      this._closeDropdowns = null;
    }
    if (this.equipment) {
      this.equipment.destroy();
      this.equipment = null;
    }
    if (this.chestPanel) {
      this.chestPanel.destroy();
      this.chestPanel = null;
    }
    this._xpFill = null;
    this._xpText = null;
    this._levelEl = null;
    this._shopDD = null;
    this._settingsDD = null;
    this._shopMenu = null;
    this._settingsMenu = null;
    this.container.innerHTML = "";
  }
}
