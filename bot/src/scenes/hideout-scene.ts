import { Equipment } from "../ui/equipment.js";
import { ChestPanel } from "../ui/chest-panel.js";
import { FriendsPanel } from "../ui/friends-panel.js";
import { TradePanel } from "../ui/trade-panel.js";
import { IS_TESTING } from "../config.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { getCharacterClass } from "../data/character-classes.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import { ProjectileLayer } from "../ui/projectile-layer.js";
import { CLASS_DEFS, statsAtLevel, specialAtLevel, STAT_LABELS, RESISTANCE_LABELS, MAX_LEVEL } from "@shared/class-stats";
import { ELEMENT_COLORS } from "@shared/types";
import { ACTIVE_SKILLS, CLASS_ACTIVE_SKILLS, getSkillScalingType, computeEffectiveSkillLevel, computeSkillLevelGrowth } from "@shared/active-skills";
import type { ActiveSkillDef, ClassId } from "@shared/active-skills";
import { buildSkillTree } from "../data/skill-tree.js";
import type { SharedDeps, SkinConfig, Character } from "../types.js";
import { music } from "../ui/music.js";

/** Format number with thin-space thousands separator: 1 000 000 */
function fmtN(n: number): string {
  return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

/**
 * HideoutScene - home hub screen.
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
  friendsPanel: FriendsPanel | null;
  tradePanel: TradePanel | null;
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
    this.friendsPanel = null;
    this.tradePanel = null;
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

    // Refresh stats in background so stats overlay always shows fresh values
    this.state.refreshState().catch(() => {});

    const player = this.state.data.player;
    const char = this.state.getActiveCharacter();
    const cls = char ? getCharacterClass(char.classId) : null;

    this.container.innerHTML = `
      <div class="hideout">
        <!-- Top bar - title + Shop / Settings -->
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
              <button class="hideout-dropdown__item" data-action="shards">
                <span class="hideout-dropdown__icon">&#x1F48E;</span> Shards
              </button>
              <button class="hideout-dropdown__item" data-action="market">
                <span class="hideout-dropdown__icon">&#x1FA99;</span> Market
              </button>
            </div>
          </div>

          <span class="hideout-topbar__title">Hideout</span>

          <!-- Music toggle -->
          <button class="hideout-music-btn" id="hideout-music-btn" title="Toggle music">
            ${music.enabled ? "&#x1F50A;" : "&#x1F507;"}
          </button>

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
              <button class="hideout-dropdown__item" data-action="storybook">
                <span class="hideout-dropdown__icon">&#x1F3A8;</span> Storybook
              </button>
            </div>
          </div>
        </div>

        <!-- Hero area + overlaid character info -->
        <div class="hideout-hero">
          <canvas class="hideout-hero__canvas" id="hideout-hero-canvas"></canvas>
          ${char ? `
          <div class="hideout-char-info">
            <div class="hideout-char-info__top">
              <span class="hideout-char-info__league">${(char as any).leagueType !== "standard" ? ((char as any).leagueName || "League").replace(/\s*\d{4}$/, "") : "Standard"}</span>
            </div>
            <div class="hideout-char-info__bottom">
              <span class="hideout-char-info__class">${cls ? cls.icon + " " + cls.name : char.classId}</span>
              <span class="hideout-char-info__name">${char.nickname}</span>
            </div>
          </div>
          ` : ""}
        </div>

        <!-- Bottom section: nav grid + XP bar -->
        <div class="hideout-bottom">
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
            <button class="hideout-btn hideout-btn--trade" id="hideout-trade-btn">
              <span class="hideout-btn__icon">&#x1FA99;</span>
              <span class="hideout-btn__label">Trade</span>
            </button>
            <button class="hideout-btn hideout-btn--friends" id="hideout-friends-btn">
              <span class="hideout-btn__icon">&#x1F465;</span>
              <span class="hideout-btn__label">Friends</span>
            </button>
            <button class="hideout-btn hideout-btn--dojo" id="hideout-dojo-btn">
              <span class="hideout-btn__icon">&#x1F94B;</span>
              <span class="hideout-btn__label">Dojo</span>
            </button>
            <button class="hideout-btn hideout-btn--stats" id="hideout-stats-btn">
              <span class="hideout-btn__icon">&#x1F4CA;</span>
              <span class="hideout-btn__label">Character</span>
            </button>
          </div>
          <div class="bottom-xp-row">
            <span id="hideout-level" class="bottom-level-display">Lv.${player.level}</span>
            <div class="xp-bar bottom-xp-bar" id="hideout-xp-bar">
              <div class="xp-bar__fill" id="hideout-xp-fill" style="width:${player.xpToNext > 0 ? (player.xp / player.xpToNext * 100) : 0}%"></div>
              <div class="xp-bar__text" id="hideout-xp-text">${fmtN(player.xp)} / ${fmtN(player.xpToNext)}</div>
            </div>
            <div class="daily-bonus-indicator" id="daily-bonus-indicator" style="${(char?.dailyBonusRemaining ?? 3) <= 0 ? 'display:none' : ''}">
              <span class="daily-bonus-indicator__star">&#x2B50;</span>
              <span class="daily-bonus-indicator__count" id="daily-bonus-count">${char?.dailyBonusRemaining ?? 3}</span>
              <div class="daily-bonus-indicator__tooltip">
                <div class="daily-bonus-indicator__tooltip-title">Daily Bonus</div>
                <div class="daily-bonus-indicator__tooltip-desc">First 3 wins each day give <strong>x3 XP</strong></div>
                <div class="daily-bonus-indicator__tooltip-remaining"><span id="daily-bonus-tooltip-count">${char?.dailyBonusRemaining ?? 3}</span> bonus wins remaining</div>
              </div>
            </div>
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
    this.equipment = new Equipment(hideoutEl, this.events, this.state);
    this.chestPanel = new ChestPanel(hideoutEl, this.events, this.state);
    this.friendsPanel = new FriendsPanel(hideoutEl, this.events, this.state);
    this.tradePanel = new TradePanel(hideoutEl, this.events, this.state);

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

    (this.container.querySelector("#hideout-trade-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.tradePanel) this.tradePanel.toggle();
    });

    (this.container.querySelector("#hideout-friends-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.friendsPanel) this.friendsPanel.toggle();
    });

    (this.container.querySelector("#hideout-dojo-btn") as HTMLButtonElement).addEventListener("click", () => {
      if (this.sceneManager) this.sceneManager.switchTo("dojo");
    });

    // -- Stats button --------------------------------------
    const statsBtn = this.container.querySelector("#hideout-stats-btn") as HTMLButtonElement | null;
    if (statsBtn) {
      statsBtn.addEventListener("click", () => this._openStatsOverlay());
    }

    // -- Music toggle --------------------------------------
    const musicBtn = this.container.querySelector("#hideout-music-btn") as HTMLButtonElement | null;
    if (musicBtn) {
      musicBtn.addEventListener("click", () => {
        const on = music.toggle();
        musicBtn.innerHTML = on ? "&#x1F50A;" : "&#x1F507;";
      });
    }
    music.play("/assets/music/ToE main theme.mp3");

    // -- Top bar dropdowns ---------------------------------
    this._wireDropdown("shop-toggle", "shop-menu", {
      skins: () => this.sceneManager.switchTo("skinShop"),
      hideouts: () => console.log("[Hideout] Hideouts clicked - not implemented yet"),
      shards: () => this.sceneManager.switchTo("shop"),
      market: () => this.sceneManager.switchTo("market"),
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
    if (this._xpText) this._xpText.textContent = `${fmtN(p.xp)} / ${fmtN(p.xpToNext)}`;
  }

  /* -- Daily bonus indicator ------------------------------ */

  _updateDailyBonus(remaining: number): void {
    const countEl = this.container.querySelector("#daily-bonus-count");
    const tooltipCountEl = this.container.querySelector("#daily-bonus-tooltip-count");
    if (countEl) countEl.textContent = String(remaining);
    if (tooltipCountEl) tooltipCountEl.textContent = String(remaining);

    // Hide indicator entirely when bonus is depleted
    if (this._dailyBonusEl) {
      if (remaining <= 0) {
        (this._dailyBonusEl as HTMLElement).style.display = "none";
      } else {
        (this._dailyBonusEl as HTMLElement).style.display = "";
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
    const maxH = h * 0.92;
    const scale = Math.min(maxH / frameH, (w * 0.85) / frameW);
    const dw = frameW * scale;
    const dh = frameH * scale;
    const dx = (w - dw) / 2;
    const offsetY = skin.anchorOffsetY ?? 0;
    const dy = (h - dh) / 2 - dh * (offsetY - 0.2);

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

        <div class="stats-overlay__tabs">
          <button class="stats-overlay__tab-btn stats-overlay__tab-btn--active" data-stats-tab="general">Character</button>
          <button class="stats-overlay__tab-btn" data-stats-tab="skills">Attacks</button>
        </div>

        <div class="stats-overlay__body">
          <!-- ═══ General Stats tab ═══ -->
          <div class="stats-overlay__tab-content" id="stats-tab-general">
            <div class="stats-overlay__section-title">Combat Stats</div>
            ${this._statRow(STAT_LABELS.hp.icon, "HP", String(char.maxHp ?? curStats.hp), String(maxStats.hp))}
            ${this._statRow(STAT_LABELS.tapDamage.icon, '<span class="stat-bugei">Bugei</span> Damage', String(char.tapDamage), String(maxStats.tapDamage))}
            ${this._statRow(STAT_LABELS.critChance.icon, '<span class="stat-bugei">Bugei</span> Crit Chance', fmtPct(char.critChance), fmtPct(maxStats.critChance))}
            ${this._statRow(STAT_LABELS.critMultiplier.icon, '<span class="stat-bugei">Bugei</span> Crit Damage', fmtPct(char.critMultiplier), fmtPct(maxStats.critMultiplier))}
            ${(char.arcaneCritChance ?? 0) > 0 || char.classId === 'mage' ? `
            ${this._statRow("🔮", '<span class="stat-arcane">Arcane</span> Crit Chance', fmtPct(char.arcaneCritChance ?? 0), fmtPct(maxStats.arcaneCritChance))}
            ${this._statRow("🔮", '<span class="stat-arcane">Arcane</span> Crit Damage', fmtPct(char.arcaneCritMultiplier ?? 1.5), fmtPct(maxStats.arcaneCritMultiplier))}
            ` : ""}
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

            ${((char as any).armor > 0 || (char as any).blockChance > 0 || (char as any).cooldownReduction > 0 || (char as any).lifeOnHit > 0 || (char as any).lifeRegen > 0 || (char as any).goldFind > 0 || (char as any).xpBonus > 0 || (char as any).passiveDpsBonus > 0) ? `
            <div class="stats-overlay__section-title">Equipment Bonuses</div>
            ${(char as any).armor > 0 ? this._statRowSimple("🛡️", "Armor", String(Math.floor((char as any).armor))) : ""}
            ${(char as any).blockChance > 0 ? this._statRowSimple("🔰", "Block", Math.round((char as any).blockChance * 100) + "%") : ""}
            ${(char as any).cooldownReduction > 0 ? this._statRowSimple("⏱️", "CDR", Math.round((char as any).cooldownReduction) + "%") : ""}
            ${(char as any).passiveDpsBonus > 0 ? this._statRowSimple("⚡", "Passive DPS", "+" + Math.round((char as any).passiveDpsBonus) + "%") : ""}
            ${(char as any).lifeOnHit > 0 ? this._statRowSimple("💚", "Life on Hit", "+" + Math.floor((char as any).lifeOnHit)) : ""}
            ${(char as any).lifeRegen > 0 ? this._statRowSimple("💗", "Life Regen", "+" + ((char as any).lifeRegen as number).toFixed(1) + "/s") : ""}
            ${(char as any).goldFind > 0 ? this._statRowSimple("💰", "Gold Find", "+" + Math.round((char as any).goldFind) + "%") : ""}
            ${(char as any).xpBonus > 0 ? this._statRowSimple("✨", "XP Bonus", "+" + Math.round((char as any).xpBonus) + "%") : ""}
            ` : ""}

            <div class="stats-overlay__section-title">Resistances</div>
            ${Object.entries(RESISTANCE_LABELS).map(([key, r]) => {
              const val = char.resistance ? (char.resistance as any)[key] || 0 : (curStats.resistance as any)[key] || 0;
              const armorFlat = key === 'physical' ? Math.floor((char as any).armor || 0) : 0;
              // armor / (armor + 1000) — reduction vs a 100-dmg physical hit
              const armorPct = armorFlat > 0 ? Math.round(armorFlat / (armorFlat + 1000) * 100) : 0;
              return `<div class="stats-overlay__res-row">
                <span class="stats-overlay__res-dot" style="background:${r.color}"></span>
                <span class="stats-overlay__res-label">${r.label}</span>
                <span class="stats-overlay__res-value" style="color:${val > 0 || armorFlat > 0 ? r.color : 'var(--game-text)'}">${armorFlat > 0 ? `🛡️${armorFlat} <span style="opacity:0.7;font-size:0.85em">(${armorPct}%)</span> + ` : ''}${val}%</span>
              </div>`;
            }).join("")}

            ${def && IS_TESTING ? `
            <div class="stats-overlay__section-title">Per-Level Growth</div>
            <div class="stats-overlay__growth-grid">
              <span>HP</span><span>+${def.growth.hp}/lv</span>
              <span><span class="stat-bugei">Bugei</span> Dmg</span><span>+${def.growth.tapDamage}/lv</span>
              <span><span class="stat-bugei">Bugei</span> Crit%</span><span>+${(def.growth.critChance * 100).toFixed(1)}%/lv</span>
              <span><span class="stat-bugei">Bugei</span> Crit Dmg</span><span>+${Math.round(def.growth.critMultiplier * 100)}%/lv</span>
              <span>Dodge</span><span>+${(def.growth.dodgeChance * 100).toFixed(1)}%/lv</span>
              ${def.growth.arcaneCritChance > 0 ? `<span><span class="stat-arcane">Arcane</span> Crit%</span><span>+${(def.growth.arcaneCritChance * 100).toFixed(1)}%/lv</span>` : ""}
              ${def.growth.arcaneCritMultiplier > 0 ? `<span><span class="stat-arcane">Arcane</span> Crit Dmg</span><span>+${Math.round(def.growth.arcaneCritMultiplier * 100)}%/lv</span>` : ""}
              ${special ? `<span>${special.name}</span><span>+${(def.special.growth * 100).toFixed(1)}%/lv</span>` : ""}
            </div>
            ` : ""}
          </div>

          <!-- ═══ Skills tab ═══ -->
          <div class="stats-overlay__tab-content hidden" id="stats-tab-skills">
            ${this._buildSkillsTab(char)}
          </div>
        </div>
      </div>
    `;

    const hideoutEl = this.container.querySelector(".hideout") as HTMLElement;
    hideoutEl.appendChild(overlay);

    // Close handlers
    const close = () => overlay.remove();
    overlay.querySelector("#stats-close")!.addEventListener("click", close);
    overlay.querySelector(".stats-overlay__backdrop")!.addEventListener("click", close);

    // Tab switching
    overlay.querySelector(".stats-overlay__tabs")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".stats-overlay__tab-btn") as HTMLElement | null;
      if (!btn) return;
      const tab = btn.dataset.statsTab;
      if (!tab) return;
      overlay.querySelectorAll(".stats-overlay__tab-btn").forEach(b => {
        b.classList.toggle("stats-overlay__tab-btn--active", (b as HTMLElement).dataset.statsTab === tab);
      });
      overlay.querySelectorAll(".stats-overlay__tab-content").forEach(c => {
        c.classList.toggle("hidden", (c as HTMLElement).id !== `stats-tab-${tab}`);
      });
      // Load skill icons when switching to skills tab
      if (tab === "skills") this._loadStatsSkillIcons(overlay);
    });

    // Load skill icons asynchronously (for skills tab if visible)
    this._loadStatsSkillIcons(overlay);
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

  /** Simple stat row without max comparison (for equipment bonuses) */
  _statRowSimple(icon: string, label: string, value: string): string {
    return `<div class="stats-overlay__stat-row">
      <span class="stats-overlay__stat-icon">${icon}</span>
      <span class="stats-overlay__stat-label">${label}</span>
      <span class="stats-overlay__stat-current" style="color:var(--game-accent, #00bfff)">${value}</span>
    </div>`;
  }

  /** Build Skills tab content - only unlocked skills with full detail */
  _buildSkillsTab(char: Character): string {
    const tree = buildSkillTree();
    const allocSet = new Set(char.allocatedNodes || []);

    // Find unlocked active skills from allocated tree nodes
    const unlockedSkills: ActiveSkillDef[] = [];
    for (const nodeId of allocSet) {
      const node = tree.nodes[nodeId];
      if (!node || node.type !== "activeSkill") continue;
      const skillId = node.def?.activeSkillId;
      if (skillId && ACTIVE_SKILLS[skillId as keyof typeof ACTIVE_SKILLS]) {
        unlockedSkills.push(ACTIVE_SKILLS[skillId as keyof typeof ACTIVE_SKILLS]);
      }
    }

    const baseDmg = char.tapDamage || 1;
    const critChance = char.critChance || 0;
    const critMult = char.critMultiplier || 1.5;
    const expectedMult = (1 - critChance) + critChance * critMult;
    // Arcane crit (mage-specific, used for arcane skills DPS)
    const arcaneCritChance = char.arcaneCritChance || 0;
    const arcaneCritMult = char.arcaneCritMultiplier || 1.5;
    const arcaneExpectedMult = (1 - arcaneCritChance) + arcaneCritChance * arcaneCritMult;
    // CDR factor: reduce all cooldowns
    const cdrFactor = 1 - (char.cooldownReduction || 0) / 100;

    // Per-skill level bonuses from equipment + tree
    const wpnLv = (char as any).weaponSpellLevel || 0;
    const arcLv = (char as any).arcaneSpellLevel || 0;
    const verLv = (char as any).versatileSpellLevel || 0;

    // Elemental damage profile for Hit card
    const elemDmg = (char as any).elementalDamage || { physical: 1.0 };
    const elemEntries = Object.entries(elemDmg as Record<string, number>).filter(([, v]) => v > 0);

    let html = `<div class="stats-overlay__skill-cards">`;

    // ── Hit card (always shown) — Weapon type ──
    const hitEffLv = computeEffectiveSkillLevel(char.level, 'weapon', wpnLv, arcLv, verLv);
    const hitGrowth = computeSkillLevelGrowth(hitEffLv);
    const hitDmg = Math.floor(baseDmg * hitGrowth);
    const hitExpected = Math.floor(hitDmg * expectedMult);
    html += `<div class="stats-overlay__skill-card stats-overlay__skill-card--tap">
      <div class="stats-overlay__skill-card-head">
        <div class="stats-overlay__skill-icon-slot" style="font-size:22px;background:rgba(164,2,57,0.15);border-color:rgba(164,2,57,0.3)">&#x1F44A;</div>
        <div class="stats-overlay__skill-card-title">
          <span class="stats-overlay__skill-card-name">Hit <span style="color:#F9CF87;font-size:0.8em">⚔️ Bugei Lv.${hitEffLv}</span></span>
          <span class="stats-overlay__skill-card-desc">A focused strike channeled through your weapon</span>
        </div>
      </div>
      <div class="stats-overlay__skill-card-elems">${elemEntries.map(([elem, frac]) =>
        `<span class="stats-overlay__elem-tag" style="border-color:${(ELEMENT_COLORS as any)[elem] || '#888'};color:${(ELEMENT_COLORS as any)[elem] || '#888'}">${elem} ${Math.round((frac as number) * 100)}%</span>`
      ).join("")}</div>
      ${((char as any).gearFireDmg > 0 || (char as any).gearColdDmg > 0 || (char as any).gearLightningDmg > 0) ? `
      <div class="stats-overlay__skill-card-elems" style="margin-top:2px">
        ${(char as any).gearFireDmg > 0 ? '<span class="stats-overlay__elem-tag" style="border-color:#ff4500;color:#ff4500">+' + Math.floor((char as any).gearFireDmg) + ' fire</span>' : ""}
        ${(char as any).gearColdDmg > 0 ? '<span class="stats-overlay__elem-tag" style="border-color:#87ceeb;color:#87ceeb">+' + Math.floor((char as any).gearColdDmg) + ' cold</span>' : ""}
        ${(char as any).gearLightningDmg > 0 ? '<span class="stats-overlay__elem-tag" style="border-color:#00bfff;color:#00bfff">+' + Math.floor((char as any).gearLightningDmg) + ' lightning</span>' : ""}
      </div>` : ""}
      <div class="stats-overlay__skill-card-stats">
        <div class="stats-overlay__skill-card-stat">
          <span class="stats-overlay__skill-card-stat-label">Damage</span>
          <span class="stats-overlay__skill-card-stat-value">${hitExpected.toLocaleString()}</span>
        </div>
        <div class="stats-overlay__skill-card-stat">
          <span class="stats-overlay__skill-card-stat-label">Base</span>
          <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--gold">${baseDmg}</span>
        </div>
      </div>
    </div>`;

    // ── Unlocked skill cards ──
    if (unlockedSkills.length === 0) {
      html += `<div class="stats-overlay__skills-empty">No skills unlocked yet.<br>Allocate skill tree nodes to unlock active skills.</div>`;
    }

    for (const skill of unlockedSkills) {
      const cdSec = (skill.cooldownMs / 1000) * cdrFactor;
      const sType = getSkillScalingType(skill);
      const sEffLv = computeEffectiveSkillLevel(char.level, sType, wpnLv, arcLv, verLv);
      const sGrowth = computeSkillLevelGrowth(sEffLv);
      const typeIcon = sType === 'arcane' ? '🔮' : '⚔️';
      const typeName = sType === 'arcane' ? 'Arcane' : 'Bugei';

      // Use skill description from definition
      const desc = skill.description || "";

      // Elemental tags
      const elemEntries = Object.entries(skill.elementalProfile || {}).filter(([, v]) => (v as number) > 0);
      const elemHtml = elemEntries.length > 0
        ? `<div class="stats-overlay__skill-card-elems">${elemEntries.map(([elem, frac]) =>
            `<span class="stats-overlay__elem-tag" style="border-color:${(ELEMENT_COLORS as any)[elem] || '#888'};color:${(ELEMENT_COLORS as any)[elem] || '#888'}">${elem} ${Math.round((frac as number) * 100)}%</span>`
          ).join("")}</div>`
        : "";

      // Stats grid (depends on skill type)
      let statsHtml = "";
      if (skill.skillType === "damage") {
        // Arcane: spellBase × growth; Weapon: tapDmg × mult × growth
        let rawDmg: number;
        if (sType === 'arcane') {
          rawDmg = Math.floor(skill.spellBase! * sGrowth);
        } else {
          rawDmg = Math.floor(baseDmg * skill.damageMultiplier * sGrowth);
        }
        // Arcane skills use arcane crits, weapon skills use regular crits
        const skillExpMult = sType === 'arcane' ? arcaneExpectedMult : expectedMult;
        const expDmg = Math.floor(rawDmg * skillExpMult);
        const dps = (expDmg / cdSec).toFixed(0);
        statsHtml = `
          <div class="stats-overlay__skill-card-stats">
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Damage</span>
              <span class="stats-overlay__skill-card-stat-value">${expDmg.toLocaleString()}</span>
            </div>
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">DPS</span>
              <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--cyan">${Number(dps).toLocaleString()}</span>
            </div>
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Cooldown</span>
              <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--gold">${cdSec.toFixed(1)}s</span>
            </div>
          </div>`;
      } else if (skill.skillType === "heal") {
        statsHtml = `
          <div class="stats-overlay__skill-card-stats" style="grid-template-columns:1fr 1fr">
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Heal</span>
              <span class="stats-overlay__skill-card-stat-value" style="color:#7fef7f">${Math.round((skill.healPercent || 0) * 100)}%</span>
            </div>
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Cooldown</span>
              <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--gold">${cdSec.toFixed(1)}s</span>
            </div>
          </div>`;
      } else {
        // buff / debuff
        const eff = skill.effect;
        const isArmorToDmg = eff?.stat === 'armorToDamage';
        const effVal = isArmorToDmg
          ? `${Math.round((eff?.value || 0) * 100)}% 🛡️→⚔️`
          : eff && eff.value < 1 ? `${Math.round(eff.value * 100)}%` : String(Math.round(eff?.value || 0));
        statsHtml = `
          <div class="stats-overlay__skill-card-stats" style="grid-template-columns:1fr 1fr 1fr">
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Value</span>
              <span class="stats-overlay__skill-card-stat-value" style="color:${skill.skillType === 'buff' ? '#F9CF87' : '#B9508D'}">${effVal}</span>
            </div>
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Duration</span>
              <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--cyan">${eff ? (eff.durationMs / 1000).toFixed(0) : "?"}s</span>
            </div>
            <div class="stats-overlay__skill-card-stat">
              <span class="stats-overlay__skill-card-stat-label">Cooldown</span>
              <span class="stats-overlay__skill-card-stat-value stats-overlay__skill-card-stat-value--gold">${cdSec.toFixed(1)}s</span>
            </div>
          </div>`;
      }

      html += `<div class="stats-overlay__skill-card">
        <div class="stats-overlay__skill-card-head">
          <div class="stats-overlay__skill-icon-slot" data-skill-id="${skill.id}"></div>
          <div class="stats-overlay__skill-card-title">
            <span class="stats-overlay__skill-card-name">${skill.name} <span style="color:#F9CF87;font-size:0.8em">${typeIcon} ${typeName} Lv.${sEffLv}</span></span>
            <span class="stats-overlay__skill-card-desc">${desc}</span>
          </div>
        </div>
        ${elemHtml}
        ${statsHtml}
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  /** Async load skill icons into the stats overlay skill cards */
  async _loadStatsSkillIcons(overlay: HTMLElement): Promise<void> {
    const projLayer = new ProjectileLayer();
    const slots = overlay.querySelectorAll("[data-skill-id]");

    for (const slot of slots) {
      const skillId = (slot as HTMLElement).dataset.skillId;
      if (!skillId) continue;
      // Skip already loaded
      if (slot.querySelector(".stats-overlay__skill-icon-img")) continue;

      const skill = ACTIVE_SKILLS[skillId as keyof typeof ACTIVE_SKILLS];
      if (!skill) continue;

      try {
        const jsonUrl = `/assets/${skill.spritePath}`;
        await projLayer.load(skillId, jsonUrl);
        const iconCanvas = projLayer.getIcon(skillId, 40);
        if (iconCanvas && slot.isConnected) {
          iconCanvas.className = "stats-overlay__skill-icon-img";
          slot.appendChild(iconCanvas);
        }
      } catch {
        // Silent fail for icon loading
      }
    }
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
    if (this.friendsPanel) {
      this.friendsPanel.destroy();
      this.friendsPanel = null;
    }
    if (this.tradePanel) {
      this.tradePanel.destroy();
      this.tradePanel = null;
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
