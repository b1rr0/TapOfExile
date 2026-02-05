import { Equipment } from "../ui/equipment.js";
import { ChestPanel } from "../ui/chest-panel.js";
import { IS_TESTING } from "../main.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { getCharacterClass } from "../data/character-classes.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import { CLASS_DEFS, statsAtLevel, specialAtLevel, STAT_LABELS, RESISTANCE_LABELS, MAX_LEVEL } from "@shared/class-stats";
import { ELEMENT_COLORS } from "@shared/types";
import type { SharedDeps, SkinConfig, Character } from "../types.js";

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
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  equipment: Equipment | null;
  chestPanel: ChestPanel | null;
  _goldHandler: ((data: any) => void) | null;
  _levelHandler: ((data: any) => void) | null;
  _xpHandler: (() => void) | null;
  _heroEngine: SpriteEngine | null;
  _heroRaf: number | null;
  _heroCtx: CanvasRenderingContext2D | null;
  _heroCanvas: HTMLCanvasElement | null;
  _heroSkin: SkinConfig | null;
  _heroDpr: number;
  _closeDropdowns: ((e: MouseEvent) => void) | null;

  // Cached DOM refs (set in mount)
  _xpFill: HTMLElement | null;
  _xpText: HTMLElement | null;
  _levelEl: HTMLElement | null;
  _shopDD: HTMLElement | null;
  _settingsDD: HTMLElement | null;
  _shopMenu: HTMLElement | null;
  _settingsMenu: HTMLElement | null;
  _dailyBonusEl: HTMLElement | null;
  _dailyBonusHandler: ((data: any) => void) | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this.equipment = null;
    this.chestPanel = null;
    this._goldHandler = null;
    this._levelHandler = null;
    this._xpHandler = null;
    this._heroEngine = null;
    this._heroRaf = null;
    this._heroCtx = null;
    this._heroCanvas = null;
    this._heroSkin = null;
    this._heroDpr = 1;
    this._closeDropdowns = null;

    // Cached DOM refs (set in mount)
    this._xpFill = null;
    this._xpText = null;
    this._levelEl = null;
    this._shopDD = null;
    this._settingsDD = null;
    this._shopMenu = null;
    this._settingsMenu = null;
    this._dailyBonusEl = null;
    this._dailyBonusHandler = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    // Check if endgame should be unlocked (async, fire-and-forget)
    this.state.checkEndgameUnlock().catch(() => {});

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
          <div class="hideout-char-info__league">${(char as any).leagueType !== "standard" ? ((char as any).leagueName || "League").replace(/\s*\d{4}$/, "") : "Standard"}</div>
          <button class="hideout-char-info__stats-btn" id="hideout-stats-btn">Stats</button>
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
            <div class="daily-bonus-indicator" id="daily-bonus-indicator">
              <span class="daily-bonus-indicator__star">&#x2B50;</span>
              <span class="daily-bonus-indicator__count" id="daily-bonus-count">${char?.dailyBonusRemaining ?? 3}</span>
              <div class="daily-bonus-indicator__tooltip">
                <div class="daily-bonus-indicator__tooltip-title">Daily Bonus</div>
                <div class="daily-bonus-indicator__tooltip-desc">First 3 wins each day give <strong>x3 XP</strong></div>
                <div class="daily-bonus-indicator__tooltip-remaining"><span id="daily-bonus-tooltip-count">${char?.dailyBonusRemaining ?? 3}</span> bonus wins remaining</div>
              </div>
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
            <button class="hideout-btn hideout-btn--tree" id="hideout-tree-btn">
              <span class="hideout-btn__icon">&#x1F333;</span>
              <span class="hideout-btn__label">Tree</span>
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
    this._dailyBonusEl = this.container.querySelector("#daily-bonus-indicator");

    // Overlays (attached to hideout root)
    const hideoutEl = this.container.querySelector(".hideout") as HTMLElement;
    this.equipment = new Equipment(hideoutEl, this.events);
    this.chestPanel = new ChestPanel(hideoutEl, this.events, this.state);

    // -- Bottom nav buttons --------------------------------
    (this.container.querySelector("#hideout-map-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.sceneManager) this.sceneManager.switchTo("map");
    });

    (this.container.querySelector("#hideout-equip-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.equipment) this.equipment.toggle();
    });

    (this.container.querySelector("#hideout-chest-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.chestPanel) this.chestPanel.toggle();
    });

    (this.container.querySelector("#hideout-tree-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.sceneManager) this.sceneManager.switchTo("skillTree");
    });

    // -- Stats button --------------------------------------
    const statsBtn = this.container.querySelector("#hideout-stats-btn") as HTMLButtonElement | null;
    if (statsBtn) {
      statsBtn.addEventListener("click", () => this._openStatsOverlay());
    }

    // -- Top bar dropdowns ---------------------------------
    this._wireDropdown("shop-toggle", "shop-menu", {
      skins: () => this.sceneManager.switchTo("skinShop"),
      hideouts: () => console.log("[Hideout] Hideouts clicked — not implemented yet"),
    });

    this._wireDropdown("settings-toggle", "settings-menu", {
      heroes: () => this.sceneManager.switchTo("characterSelect"),
      storybook: () => this.sceneManager.switchTo("storybook"),
    });

    // Close dropdowns on any outside click (uses cached refs)
    this._closeDropdowns = (e: MouseEvent) => {
      if (this._shopDD && !this._shopDD.contains(e.target as Node)) {
        if (this._shopMenu) this._shopMenu.classList.add("hideout-dropdown--hidden");
      }
      if (this._settingsDD && !this._settingsDD.contains(e.target as Node)) {
        if (this._settingsMenu) this._settingsMenu.classList.add("hideout-dropdown--hidden");
      }
    };
    document.addEventListener("click", this._closeDropdowns);

    // -- Live-update level & XP ----------------------------
    this._goldHandler = null;
    this._levelHandler = (data: any) => {
      if (this._levelEl) this._levelEl.textContent = `Lv.${data.level}`;
      this._updateXpBar();
    };
    this._xpHandler = () => {
      this._updateXpBar();
    };
    this._dailyBonusHandler = (data: any) => {
      this._updateDailyBonus(data.remaining);
    };
    this.events.on("levelUp", this._levelHandler);
    this.events.on("xpChanged", this._xpHandler);
    this.events.on("dailyBonusChanged", this._dailyBonusHandler);

    // Load hero sprite
    this._loadHeroSprite();
  }

  /* -- Dropdown helpers ------------------------------------ */

  _wireDropdown(toggleId: string, menuId: string, actions: Record<string, () => void>): void {
    const toggle = this.container.querySelector(`#${toggleId}`) as HTMLElement | null;
    const menu = menuId === "shop-menu" ? this._shopMenu : this._settingsMenu;
    const otherMenu = menuId === "shop-menu" ? this._settingsMenu : this._shopMenu;
    if (!toggle || !menu) return;

    // Toggle menu visibility on button click
    toggle.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();

      // Close the other menu first (cached ref, no querySelectorAll)
      if (otherMenu) otherMenu.classList.add("hideout-dropdown--hidden");

      menu.classList.toggle("hideout-dropdown--hidden");
    });

    // Wire action items
    menu.addEventListener("click", (e: MouseEvent) => {
      const item = (e.target as HTMLElement).closest(".hideout-dropdown__item") as HTMLElement | null;
      if (!item) return;

      const action = item.dataset.action;
      if (action && actions[action]) {
        actions[action]();
      }

      // Close menu after action
      menu.classList.add("hideout-dropdown--hidden");
    });
  }

  _hideMenu(menuId: string): void {
    const menu = menuId === "shop-menu" ? this._shopMenu : this._settingsMenu;
    if (menu) menu.classList.add("hideout-dropdown--hidden");
  }

  /* -- XP bar --------------------------------------------- */

  _updateXpBar(): void {
    const p = this.state.data.player;
    if (!p) return;
    const pct = p.xpToNext > 0 ? (p.xp / p.xpToNext) * 100 : 0;
    if (this._xpFill) (this._xpFill as HTMLElement).style.width = pct + "%";
    if (this._xpText) this._xpText.textContent = `${p.xp} / ${p.xpToNext}`;
  }

  /* -- Daily bonus indicator ------------------------------ */

  _updateDailyBonus(remaining: number): void {
    const countEl = this.container.querySelector("#daily-bonus-count");
    const tooltipCountEl = this.container.querySelector("#daily-bonus-tooltip-count");
    if (countEl) countEl.textContent = String(remaining);
    if (tooltipCountEl) tooltipCountEl.textContent = String(remaining);

    // Add visual feedback when bonus is depleted
    if (this._dailyBonusEl) {
      if (remaining <= 0) {
        this._dailyBonusEl.classList.add("daily-bonus-indicator--depleted");
      } else {
        this._dailyBonusEl.classList.remove("daily-bonus-indicator--depleted");
      }
    }
  }

  /* -- Canvas hero sprite --------------------------------- */

  async _loadHeroSprite(): Promise<void> {
    const char = this.state.getActiveCharacter();
    if (!char) return;

    const skin = getHeroSkin(char.skinId);
    if (!skin) return;

    const canvas = this.container.querySelector("#hideout-hero-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    // Size canvas to hero area
    const heroArea = this.container.querySelector(".hideout-hero") as HTMLElement;
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

  _startHeroTick(): void {
    let last = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      this._heroEngine!.update(dt);
      if (this._heroEngine!.needsRedraw) {
        this._heroEngine!.needsRedraw = false;
        this._drawHero();
      }

      this._heroRaf = requestAnimationFrame(tick);
    };

    this._heroRaf = requestAnimationFrame(tick);
  }

  _drawHero(): void {
    const ctx = this._heroCtx!;
    const w = this._heroCanvas!.width;
    const h = this._heroCanvas!.height;
    const skin = this._heroSkin!;

    ctx.clearRect(0, 0, w, h);

    const frameW = skin.defaultSize.w;
    const frameH = skin.defaultSize.h;
    const maxH = h * 0.65;
    const scale = Math.min(maxH / frameH, (w * 0.5) / frameW);
    const dw = frameW * scale;
    const dh = frameH * scale;
    const dx = (w - dw) / 2;
    const dy = h - dh - h * 0.08;

    this._heroEngine!.drawFrame(ctx, dx, dy, dw, dh, false);
  }

  /* -- Stats overlay -------------------------------------- */

  _openStatsOverlay(): void {
    const char = this.state.getActiveCharacter() as Character | null;
    if (!char) return;

    const cls = getCharacterClass(char.classId);
    const def = CLASS_DEFS[char.classId];
    const curStats = statsAtLevel(char.classId, char.level);
    const maxStats = statsAtLevel(char.classId, MAX_LEVEL);

    const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

    // Build elemental damage display
    const elemDmg = (char as any).elementalDamage || { physical: 1.0 };
    const elemEntries = Object.entries(elemDmg as Record<string, number>).filter(([, v]) => v > 0);

    // Unique ability
    const special = def?.special;
    const curSpecial = specialAtLevel(char.classId, char.level);
    const maxSpecial = specialAtLevel(char.classId, MAX_LEVEL);
    const fmtSpecial = (v: number) => special?.format === 'percent' ? fmtPct(v) : String(Math.floor(v));

    const overlay = document.createElement("div");
    overlay.className = "stats-overlay";
    overlay.innerHTML = `
      <div class="stats-overlay__backdrop"></div>
      <div class="stats-overlay__panel">
        <div class="stats-overlay__header">
          <span class="stats-overlay__title">${cls ? cls.icon + " " : ""}${char.nickname}</span>
          <span class="stats-overlay__subtitle">${cls ? cls.name : char.classId} &middot; Lv.${char.level} / ${MAX_LEVEL}</span>
          <button class="stats-overlay__close" id="stats-close">&times;</button>
        </div>

        <div class="stats-overlay__body">
          <div class="stats-overlay__section-title">Combat Stats</div>
          ${this._statRow(STAT_LABELS.hp.icon, "HP", `${char.hp ?? curStats.hp} / ${char.maxHp ?? curStats.hp}`, String(maxStats.hp))}
          ${this._statRow(STAT_LABELS.tapDamage.icon, "Damage", String(char.tapDamage), String(maxStats.tapDamage))}
          ${this._statRow(STAT_LABELS.critChance.icon, "Crit Chance", fmtPct(char.critChance), fmtPct(maxStats.critChance))}
          ${this._statRow(STAT_LABELS.critMultiplier.icon, "Crit Dmg", fmtPct(char.critMultiplier), fmtPct(maxStats.critMultiplier))}
          ${this._statRow(STAT_LABELS.dodgeChance.icon, "Dodge", fmtPct(char.dodgeChance ?? 0), fmtPct(maxStats.dodgeChance))}

          ${special ? `
          <div class="stats-overlay__section-title">Unique Ability</div>
          <div class="stats-overlay__special">
            <span class="stats-overlay__special-icon">${special.icon}</span>
            <div class="stats-overlay__special-info">
              <span class="stats-overlay__special-name">${special.name}</span>
              <span class="stats-overlay__special-desc">${special.description}</span>
            </div>
            <span class="stats-overlay__special-value">${IS_TESTING ? `${fmtSpecial(curSpecial)} → ${fmtSpecial(maxSpecial)}` : fmtSpecial(curSpecial)}</span>
          </div>
          ` : ""}

          <div class="stats-overlay__section-title">Damage Type</div>
          <div class="stats-overlay__elem-row">
            ${elemEntries.map(([elem, frac]) =>
              `<span class="stats-overlay__elem-tag" style="border-color:${(ELEMENT_COLORS as any)[elem] || '#888'}; color:${(ELEMENT_COLORS as any)[elem] || '#888'}">
                ${elem} ${Math.round(frac * 100)}%
              </span>`
            ).join("")}
          </div>

          <div class="stats-overlay__section-title">Resistances</div>
          ${Object.entries(RESISTANCE_LABELS).map(([key, r]) => {
            const val = char.resistance ? (char.resistance as any)[key] || 0 : (curStats.resistance as any)[key] || 0;
            return `<div class="stats-overlay__res-row">
              <span class="stats-overlay__res-dot" style="background:${r.color}"></span>
              <span class="stats-overlay__res-label">${r.label}</span>
              <span class="stats-overlay__res-value" style="color:${val > 0 ? r.color : 'var(--game-text)'}">${val}%</span>
            </div>`;
          }).join("")}

          ${def && IS_TESTING ? `
          <div class="stats-overlay__section-title">Per-Level Growth</div>
          <div class="stats-overlay__growth-grid">
            <span>HP</span><span>+${def.growth.hp}/lv</span>
            <span>Damage</span><span>+${def.growth.tapDamage}/lv</span>
            <span>Crit%</span><span>+${(def.growth.critChance * 100).toFixed(1)}%/lv</span>
            <span>Crit Dmg</span><span>+${Math.round(def.growth.critMultiplier * 100)}%/lv</span>
            <span>Dodge</span><span>+${(def.growth.dodgeChance * 100).toFixed(1)}%/lv</span>
            ${special ? `<span>${special.name}</span><span>+${(def.special.growth * 100).toFixed(1)}%/lv</span>` : ""}
          </div>
          ` : ""}
        </div>
      </div>
    `;

    const hideoutEl = this.container.querySelector(".hideout") as HTMLElement;
    hideoutEl.appendChild(overlay);

    // Close handlers
    const close = () => overlay.remove();
    overlay.querySelector("#stats-close")!.addEventListener("click", close);
    overlay.querySelector(".stats-overlay__backdrop")!.addEventListener("click", close);
  }

  _statRow(icon: string, label: string, current: string, max: string): string {
    if (IS_TESTING) {
      return `<div class="stats-overlay__stat-row">
        <span class="stats-overlay__stat-icon">${icon}</span>
        <span class="stats-overlay__stat-label">${label}</span>
        <span class="stats-overlay__stat-current">${current}</span>
        <span class="stats-overlay__stat-arrow">&rarr;</span>
        <span class="stats-overlay__stat-max">${max}</span>
      </div>`;
    }
    return `<div class="stats-overlay__stat-row">
      <span class="stats-overlay__stat-icon">${icon}</span>
      <span class="stats-overlay__stat-label">${label}</span>
      <span class="stats-overlay__stat-current">${current}</span>
    </div>`;
  }

  /* -- Cleanup -------------------------------------------- */

  unmount(): void {
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
    if (this._dailyBonusHandler) {
      this.events.off("dailyBonusChanged", this._dailyBonusHandler);
      this._dailyBonusHandler = null;
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
    this._dailyBonusEl = null;
    this.container.innerHTML = "";
  }
}
