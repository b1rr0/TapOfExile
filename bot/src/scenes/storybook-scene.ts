import { SpriteEngine } from "../ui/sprite-engine.js";
import { BackgroundRenderer } from "../ui/background-renderer.js";
import { ProjectileLayer } from "../ui/projectile-layer.js";
import { HeroCharacter } from "../ui/characters/hero-character.js";
import { EnemyCharacter } from "../ui/characters/enemy-character.js";
import {
  HERO_SKINS,
  ENEMY_SKINS,
  listHeroSkins,
  listEnemySkins,
  getHeroSkin,
  getEnemySkin,
} from "../data/sprite-registry.js";
import {
  ACT_DEFINITIONS,
  ACT_BACKGROUNDS,
  getActModifiers,
} from "../data/locations.js";
import { ACTIVE_SKILLS } from "@shared/active-skills.js";
import type { ActiveSkillId } from "@shared/active-skills.js";
import type { SharedDeps, SkinConfig, ActModifier } from "../types.js";

/**
 * StorybookScene — sprite preview with accordion categories.
 *
 * Single scrollable page with category buttons.
 * Click a button -> its sprite cards expand below as a dropdown list.
 * Click again (or another) -> collapses.
 *
 * Hero demo:  run -> idle -> attack -> idle (loop)
 * Enemy demo: run -> idle -> death (loop)
 * Locations demo: background + hero + enemy standing together
 */

// -- Demo phase constants ---------------------------------

const PHASE_RUN = 0;
const PHASE_IDLE = 1;
const PHASE_ACTION = 2;
const PHASE_PAUSE = 3;

const PHASE_DURATIONS: Record<number, number> = {
  [PHASE_RUN]: 1.5,
  [PHASE_IDLE]: 2.0,
  [PHASE_ACTION]: 0,
  [PHASE_PAUSE]: 1.0,
};

// -- Category definitions ---------------------------------

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  role: string;
  getSkins: () => SkinConfig[];
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "heroes",
    label: "Heroes",
    icon: "\u2694\uFE0F",
    description: "Playable character skins",
    role: "hero",
    getSkins: () => listHeroSkins().map((id: string) => HERO_SKINS[id]),
  },
  {
    id: "enemies",
    label: "Enemies",
    icon: "\uD83D\uDC79",
    description: "Monster skins",
    role: "enemy",
    getSkins: () => listEnemySkins().map((id: string) => ENEMY_SKINS[id]),
  },
  {
    id: "locations",
    label: "Locations",
    icon: "\uD83D\uDDFA\uFE0F",
    description: "Background previews with characters",
    role: "location",
    getSkins: () => [], // handled separately
  },
  {
    id: "skills",
    label: "Skills",
    icon: "\uD83D\uDD25",
    description: "Skill projectile previews",
    role: "skill",
    getSkins: () => [], // handled separately
  },
];

// -- Internal interfaces ----------------------------------

interface CardData {
  engine: SpriteEngine;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr: number;
  size: number;
  skin: SkinConfig;
  role: string;
  animLabel: HTMLElement;
  runAnim: string;
  actionAnim: string;
  phase: number;
  phaseTimer: number;
  loaded: boolean;
}

interface GroupState {
  cards: CardData[];
  listEl: HTMLElement;
  btn: HTMLElement;
  category: CategoryDef;
  open: boolean;
  loaded: boolean;
}

interface LocSceneData {
  actNum: number;
  act: any;
  mods: ActModifier[];
  bgImages: string[];
  bgIndex: number;
  bgTimer: number;
  bgRenderer: BackgroundRenderer;
  heroEngine: SpriteEngine;
  enemyEngine: SpriteEngine;
  heroSkin: SkinConfig;
  enemySkin: SkinConfig;
  loaded: boolean;
}

// -- Skill viewer types -----------------------------------

const SKILL_VARIANTS = [
  { suffix: "v0", label: "Original" },
  { suffix: "v1_crimson", label: "Crimson" },
  { suffix: "v2_emerald", label: "Emerald" },
  { suffix: "v3_azure", label: "Azure" },
  { suffix: "v4_golden", label: "Golden" },
  { suffix: "v5_violet", label: "Violet" },
  { suffix: "v6_frost", label: "Frost" },
  { suffix: "v7_shadow", label: "Shadow" },
];

interface SkillEntry {
  id: ActiveSkillId;
  name: string;
  variants: { suffix: string; label: string; jsonPath: string }[];
}

// -- Scene ------------------------------------------------

export class StorybookScene {
  container: HTMLElement;
  sceneManager: SharedDeps["sceneManager"];

  _groups: Map<string, GroupState>;
  _rafId: number | null;
  _lastTime: number;

  /** Location fullscreen viewer state */
  _locScenes: LocSceneData[];
  _locCanvas: HTMLCanvasElement | null;
  _locInfoEl: HTMLElement | null;
  _locTitleEl: HTMLElement | null;
  _locCounterEl: HTMLElement | null;
  _locOverlay: HTMLElement | null;
  _locResizeObserver: ResizeObserver | null;
  _locIndex: number;
  _locDpr: number;
  _locCanvasW: number;
  _locCanvasH: number;
  _locOpen: boolean;

  /** Skill fullscreen viewer state */
  _skillEntries: SkillEntry[];
  _skillIndex: number;
  _skillVariantIndex: number;
  _skillOverlay: HTMLElement | null;
  _skillCanvas: HTMLCanvasElement | null;
  _skillTitleEl: HTMLElement | null;
  _skillCounterEl: HTMLElement | null;
  _skillVariantEl: HTMLElement | null;
  _skillResizeObserver: ResizeObserver | null;
  _skillDpr: number;
  _skillCanvasW: number;
  _skillCanvasH: number;
  _skillOpen: boolean;
  _skillProjectileLayer: ProjectileLayer | null;
  _skillHero: HeroCharacter | null;
  _skillEnemy: EnemyCharacter | null;
  _skillBg: BackgroundRenderer | null;
  _skillLoaded: boolean;
  _skillAutoTimer: number;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.sceneManager = deps.sceneManager;

    this._groups = new Map();
    this._rafId = null;
    this._lastTime = 0;

    /** Location fullscreen viewer state */
    this._locScenes = [];
    this._locCanvas = null;
    this._locInfoEl = null;
    this._locTitleEl = null;
    this._locCounterEl = null;
    this._locOverlay = null;
    this._locResizeObserver = null;
    this._locIndex = 0;
    this._locDpr = 1;
    this._locCanvasW = 0;
    this._locCanvasH = 0;
    this._locOpen = false;

    /** Skill fullscreen viewer state */
    this._skillEntries = [];
    this._skillIndex = 0;
    this._skillVariantIndex = 0;
    this._skillOverlay = null;
    this._skillCanvas = null;
    this._skillTitleEl = null;
    this._skillCounterEl = null;
    this._skillVariantEl = null;
    this._skillResizeObserver = null;
    this._skillDpr = 1;
    this._skillCanvasW = 0;
    this._skillCanvasH = 0;
    this._skillOpen = false;
    this._skillProjectileLayer = null;
    this._skillHero = null;
    this._skillEnemy = null;
    this._skillBg = null;
    this._skillLoaded = false;
    this._skillAutoTimer = 0;
  }

  // -- Lifecycle ------------------------------------------

  mount(): void {
    this.container.innerHTML = `
      <div class="storybook">
        <div class="storybook-header">
          <button class="storybook-back" id="sb-back">&larr; Back</button>
          <span class="storybook-title">SPRITE STORYBOOK</span>
        </div>
        <div class="sb-accordion" id="sb-accordion"></div>
      </div>
    `;

    (this.container.querySelector("#sb-back") as HTMLButtonElement)
      .addEventListener("click", () => this.sceneManager.switchTo("hideout"));

    const accordion = this.container.querySelector("#sb-accordion") as HTMLElement;

    for (const cat of CATEGORIES) {
      this._createGroup(accordion, cat);
    }
  }

  unmount(): void {
    this._stopTick();
    this._destroyAll();
    this.container.innerHTML = "";
  }

  // -- Accordion group ------------------------------------

  _createGroup(accordion: HTMLElement, category: CategoryDef): void {
    // Wrapper
    const group = document.createElement("div");
    group.className = "sb-group";

    const count: number = category.id === "locations"
      ? ACT_DEFINITIONS.length
      : category.id === "skills"
        ? Object.keys(ACTIVE_SKILLS).length
        : category.getSkins().length;

    // Toggle button
    const btn = document.createElement("button");
    btn.className = "sb-group__btn";
    btn.innerHTML = `
      <span class="sb-group__icon">${category.icon}</span>
      <span class="sb-group__label">${category.label}</span>
      <span class="sb-group__count">${count}</span>
      <span class="sb-group__arrow">&#x25BC;</span>
    `;

    // Dropdown list (hidden by default)
    const listEl = document.createElement("div");
    listEl.className = "sb-group__list";

    group.appendChild(btn);
    group.appendChild(listEl);
    accordion.appendChild(group);

    // Store group state
    this._groups.set(category.id, {
      cards: [],
      listEl,
      btn,
      category,
      open: false,
      loaded: false,
    });

    btn.addEventListener("click", () => this._toggleGroup(category.id));
  }

  _toggleGroup(catId: string): void {
    const g = this._groups.get(catId);
    if (!g) return;

    // Locations & Skills open as fullscreen overlay — not accordion
    if (catId === "locations") {
      this._openLocationViewer();
      return;
    }
    if (catId === "skills") {
      this._openSkillViewer();
      return;
    }

    if (g.open) {
      // Collapse
      g.open = false;
      g.listEl.classList.remove("sb-group__list--open");
      g.btn.classList.remove("sb-group__btn--open");
      this._destroyGroupCards(catId);
    } else {
      // Expand
      g.open = true;
      g.listEl.classList.add("sb-group__list--open");
      g.btn.classList.add("sb-group__btn--open");

      const skins: SkinConfig[] = g.category.getSkins();
      for (const skin of skins) {
        this._createCard(g, skin, g.category.role);
      }
      g.loaded = true;
      this._loadGroupCards(catId);
    }

    this._ensureTick();
  }

  // -- Sprite Card creation -------------------------------

  _createCard(group: GroupState, skin: SkinConfig, role: string): void {
    const card = document.createElement("div");
    card.className = "sb-card";

    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    const canvasSize = 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = canvasSize + "px";
    canvas.style.height = canvasSize + "px";

    const info = document.createElement("div");
    info.className = "sb-card__info";

    const name = document.createElement("div");
    name.className = "sb-card__name";
    name.textContent = skin.name;

    const id = document.createElement("div");
    id.className = "sb-card__id";
    id.textContent = skin.id;

    const animLabel = document.createElement("div");
    animLabel.className = "sb-card__anim";

    info.appendChild(name);
    info.appendChild(id);
    info.appendChild(animLabel);

    card.appendChild(canvas);
    card.appendChild(info);
    group.listEl.appendChild(card);

    const engine = new SpriteEngine({
      basePath: skin.basePath,
      animations: skin.animations,
    });

    const runAnim: string = skin.animations.run
      ? "run"
      : skin.animations.walk
        ? "walk"
        : "idle";

    // Pick action anim: for heroes use attack1, for enemies pick a random attack_*
    let actionAnim: string;
    if (role === "hero") {
      actionAnim = skin.animations.attack1 ? "attack1" : "idle";
    } else {
      const attackAnims = Object.keys(skin.animations).filter(n => n.startsWith("attack_"));
      actionAnim = attackAnims.length > 0
        ? attackAnims[Math.floor(Math.random() * attackAnims.length)]
        : skin.animations.death ? "death" : "idle";
    }

    const cardData: CardData = {
      engine,
      canvas,
      ctx: canvas.getContext("2d")!,
      dpr,
      size: canvasSize,
      skin,
      role,
      animLabel,
      runAnim,
      actionAnim,
      phase: PHASE_RUN,
      phaseTimer: 0,
      loaded: false,
    };

    group.cards.push(cardData);
  }

  // -- Location Viewer (fullscreen overlay) ---------------

  _openLocationViewer(): void {
    if (this._locOverlay) return; // already open

    const dpr = window.devicePixelRatio || 1;
    this._locDpr = dpr;
    const heroIds: string[] = listHeroSkins();
    const enemyIds: string[] = listEnemySkins();

    // Build scene data for each act
    this._locScenes = [];
    for (let i = 0; i < ACT_DEFINITIONS.length; i++) {
      const act = ACT_DEFINITIONS[i];
      const actNum: number = act.act;
      const bgImages: string[] = ACT_BACKGROUNDS[actNum] || [];
      const mods: ActModifier[] = getActModifiers(actNum);
      const heroSkin = getHeroSkin(heroIds[i % heroIds.length])!;
      const enemySkin = getEnemySkin(enemyIds[i % enemyIds.length])!;

      this._locScenes.push({
        actNum, act, mods, bgImages,
        bgIndex: 0, bgTimer: 0,
        bgRenderer: new BackgroundRenderer(),
        heroEngine: new SpriteEngine({ basePath: heroSkin.basePath, animations: heroSkin.animations }),
        enemyEngine: new SpriteEngine({ basePath: enemySkin.basePath, animations: enemySkin.animations }),
        heroSkin, enemySkin,
        loaded: false,
      });
    }

    this._locIndex = 0;
    this._locOpen = true;

    // Build fullscreen overlay — mirrors combat scene layout:
    //   .hud (top bar)  ->  .battle-scene (canvas, flex:1)  ->  .combat-bottom-bar (info panel)
    const overlay = document.createElement("div");
    overlay.className = "sb-loc-fullscreen screen";
    overlay.innerHTML = `
      <!-- Top bar — same as combat HUD -->
      <div class="hud">
        <button class="hud-flee-btn" id="sb-loc-close">&larr;</button>
        <div class="hud-center">
          <button class="sb-loc-hud-arrow" id="sb-loc-prev">&#x276E;</button>
          <span class="stage-display" id="sb-loc-title">—</span>
          <button class="sb-loc-hud-arrow" id="sb-loc-next">&#x276F;</button>
        </div>
        <span class="sb-loc-counter" id="sb-loc-counter"></span>
      </div>

      <!-- Battle scene area — canvas fills this -->
      <div class="battle-scene" id="sb-loc-battle">
        <canvas class="scene-canvas" id="sb-loc-canvas"></canvas>
      </div>

      <!-- Bottom bar — description instead of ATTACK -->
      <div class="combat-bottom-bar">
        <div class="sb-loc-desc-panel" id="sb-loc-desc"></div>
      </div>
    `;

    this.container.appendChild(overlay);
    this._locOverlay = overlay;
    this._locCanvas = overlay.querySelector("#sb-loc-canvas") as HTMLCanvasElement;
    this._locInfoEl = overlay.querySelector("#sb-loc-desc");
    this._locTitleEl = overlay.querySelector("#sb-loc-title");
    this._locCounterEl = overlay.querySelector("#sb-loc-counter");

    // Wire buttons
    (overlay.querySelector("#sb-loc-close") as HTMLButtonElement).addEventListener("click", () => this._closeLocationViewer());
    (overlay.querySelector("#sb-loc-prev") as HTMLButtonElement).addEventListener("click", () => {
      this._locIndex = (this._locIndex - 1 + this._locScenes.length) % this._locScenes.length;
      this._switchLocScene();
    });
    (overlay.querySelector("#sb-loc-next") as HTMLButtonElement).addEventListener("click", () => {
      this._locIndex = (this._locIndex + 1) % this._locScenes.length;
      this._switchLocScene();
    });

    // Size canvas to match battle-scene container
    const battleEl = overlay.querySelector("#sb-loc-battle") as HTMLElement;
    this._locResizeObserver = new ResizeObserver(() => {
      this._resizeLocCanvas();
      const sc = this._locScenes[this._locIndex];
      if (sc) (sc.bgRenderer as any)._dirty = true;
    });
    this._locResizeObserver.observe(battleEl);

    requestAnimationFrame(() => {
      this._resizeLocCanvas();
      this._updateLocInfo();
    });

    // Load all scenes in parallel
    this._loadLocationScenes();
    this._ensureTick();
  }

  _closeLocationViewer(): void {
    this._locOpen = false;

    // Destroy scene data
    for (const sc of this._locScenes) {
      sc.bgRenderer.destroy();
      sc.heroEngine.destroy();
      sc.enemyEngine.destroy();
    }
    this._locScenes = [];

    if (this._locResizeObserver) {
      this._locResizeObserver.disconnect();
      this._locResizeObserver = null;
    }

    if (this._locOverlay) {
      this._locOverlay.remove();
      this._locOverlay = null;
    }
    this._locCanvas = null;
    this._locInfoEl = null;
    this._locTitleEl = null;
    this._locCounterEl = null;

    this._ensureTick();
  }

  _resizeLocCanvas(): void {
    if (!this._locCanvas || !this._locOverlay) return;
    const battleEl = this._locOverlay.querySelector("#sb-loc-battle") as HTMLElement | null;
    if (!battleEl) return;
    const rect = battleEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;
    const dpr = this._locDpr;

    this._locCanvas.width = w * dpr;
    this._locCanvas.height = h * dpr;
    this._locCanvasW = w;
    this._locCanvasH = h;

    for (const sc of this._locScenes) {
      (sc.bgRenderer as any)._dirty = true;
    }
  }

  _switchLocScene(): void {
    this._updateLocInfo();
    const sc = this._locScenes[this._locIndex];
    if (sc) (sc.bgRenderer as any)._dirty = true;
  }

  _updateLocInfo(): void {
    const sc = this._locScenes[this._locIndex];
    if (!sc) return;

    // HUD title
    if (this._locTitleEl) {
      this._locTitleEl.textContent = sc.act.name;
    }
    // HUD counter
    if (this._locCounterEl) {
      this._locCounterEl.textContent = `${this._locIndex + 1}/${this._locScenes.length}`;
    }

    // Bottom description panel
    if (!this._locInfoEl) return;

    const modsHtml = sc.mods.map(m =>
      `<div class="sb-loc-mod sb-loc-mod--${m.type}"><span class="sb-loc-mod__icon">${m.icon}</span><span class="sb-loc-mod__name">${m.name}</span><span class="sb-loc-mod__desc">${m.description}</span></div>`
    ).join("");

    this._locInfoEl.innerHTML = `
      <div class="sb-loc-desc__meta">${sc.act.locations.length} locations &bull; ${sc.bgImages.length} backgrounds &bull; BG ${sc.bgIndex + 1}/${sc.bgImages.length}</div>
      <div class="sb-loc-desc__mods">${modsHtml}</div>
    `;
  }

  async _loadLocationScenes(): Promise<void> {
    const promises = this._locScenes.map(async (sc) => {
      try {
        if (sc.bgImages.length) await sc.bgRenderer.load(sc.bgImages[0]);
        await sc.heroEngine.load();
        await sc.enemyEngine.load();
        sc.heroEngine.play("idle");
        sc.enemyEngine.play("idle");
        sc.loaded = true;
      } catch (err) {
        console.warn(`[Storybook] Failed to load location act ${sc.actNum}:`, err);
      }
    });
    await Promise.allSettled(promises);
    this._updateLocInfo();
  }

  // -- Loading --------------------------------------------

  async _loadGroupCards(catId: string): Promise<void> {
    const g = this._groups.get(catId);
    if (!g) return;

    const promises = g.cards.map(async (card) => {
      if (!card.engine) return; // skip location cards
      try {
        await card.engine.load();
        card.loaded = true;
        card.engine.play(card.runAnim);
        card.animLabel.textContent = card.runAnim;
      } catch (err) {
        card.animLabel.textContent = "load error";
        console.warn(`[Storybook] Failed to load ${card.skin.id}:`, err);
      }
    });

    await Promise.allSettled(promises);
  }

  // -- Tick loop ------------------------------------------

  _ensureTick(): void {
    // Start tick if any group is open or location/skill viewer is open
    const anyOpen = [...this._groups.values()].some((g) => g.open) || this._locOpen || this._skillOpen;
    if (anyOpen && !this._rafId) {
      this._startTick();
    } else if (!anyOpen && this._rafId) {
      this._stopTick();
    }
  }

  _startTick(): void {
    this._lastTime = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - this._lastTime) / 1000, 0.2);
      this._lastTime = now;

      // Location fullscreen viewer
      if (this._locOpen) {
        this._updateLocationScene(dt);
        this._drawLocationScene();
      }

      // Skill fullscreen viewer
      if (this._skillOpen) {
        this._updateSkillScene(dt);
        this._drawSkillScene();
      }

      // Sprite groups (heroes, enemies)
      for (const g of this._groups.values()) {
        if (!g.open) continue;
        for (const card of g.cards) {
          if (!card.loaded) continue;
          this._updateCard(card, dt);
          this._drawCard(card);
        }
      }

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  _stopTick(): void {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // -- Phase state machine (sprites) ----------------------

  _updateCard(card: CardData, dt: number): void {
    card.engine.update(dt);
    card.phaseTimer += dt;

    switch (card.phase) {
      case PHASE_RUN:
        if (card.phaseTimer >= PHASE_DURATIONS[PHASE_RUN]) {
          card.phase = PHASE_IDLE;
          card.phaseTimer = 0;
          card.engine.play("idle");
          card.animLabel.textContent = "idle";
        }
        break;

      case PHASE_IDLE:
        if (card.phaseTimer >= PHASE_DURATIONS[PHASE_IDLE]) {
          card.phase = PHASE_ACTION;
          card.phaseTimer = 0;
          card.animLabel.textContent = card.actionAnim;
          card.engine.play(card.actionAnim, {
            onComplete: () => {
              card.phase = PHASE_PAUSE;
              card.phaseTimer = 0;
              card.animLabel.textContent = "...";
            },
          });
        }
        break;

      case PHASE_ACTION:
        break;

      case PHASE_PAUSE:
        if (card.phaseTimer >= PHASE_DURATIONS[PHASE_PAUSE]) {
          card.phase = PHASE_RUN;
          card.phaseTimer = 0;
          card.engine.play(card.runAnim);
          card.animLabel.textContent = card.runAnim;
        }
        break;
    }
  }

  // -- Location viewer update/draw ------------------------

  _updateLocationScene(dt: number): void {
    if (!this._locScenes || !this._locScenes.length) return;
    const sc = this._locScenes[this._locIndex];
    if (!sc || !sc.loaded) return;

    sc.heroEngine.update(dt);
    sc.enemyEngine.update(dt);

    // Cycle backgrounds every 4 seconds
    if (sc.bgImages.length > 1) {
      sc.bgTimer += dt;
      if (sc.bgTimer >= 4.0) {
        sc.bgTimer = 0;
        sc.bgIndex = (sc.bgIndex + 1) % sc.bgImages.length;
        sc.bgRenderer.setBackground(sc.bgImages[sc.bgIndex]);
        this._updateLocInfo();
      }
    }
  }

  _drawLocationScene(): void {
    if (!this._locCanvas || !this._locScenes || !this._locScenes.length) return;
    const sc = this._locScenes[this._locIndex];
    if (!sc || !sc.loaded) return;

    const dpr = this._locDpr;
    const cw = this._locCanvas.width;
    const ch = this._locCanvas.height;
    const ctx = this._locCanvas.getContext("2d")!;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Background
    sc.bgRenderer.draw(ctx, cw, ch);

    // 2. Hero (left side, ~25% from left, feet at 90% + 10px nudge)
    if ((sc.heroEngine as any).loaded) {
      const hs = sc.heroSkin.defaultSize;
      const charScale = (ch * 0.65) / hs.h;
      const dw = hs.w * charScale;
      const dh = hs.h * charScale;
      const dx = cw * 0.20 - dw / 2;
      const dy = ch * 0.90 - dh + 10 * dpr;
      sc.heroEngine.drawFrame(ctx, dx, dy, dw, dh, false);
    }

    // 3. Enemy (right side, flipped, ~75% from left, feet at 90% + 10px nudge)
    if ((sc.enemyEngine as any).loaded) {
      const es = sc.enemySkin.defaultSize;
      const charScale = (ch * 0.65) / es.h;
      const dw = es.w * charScale;
      const dh = es.h * charScale;
      const dx = cw * 0.75 - dw / 2;
      const dy = ch * 0.90 - dh + 10 * dpr;
      sc.enemyEngine.drawFrame(ctx, dx, dy, dw, dh, true);
    }
  }

  // -- Drawing (sprites) ----------------------------------

  _drawCard(card: CardData): void {
    if (!card.engine.needsRedraw) return;
    card.engine.needsRedraw = false;

    const { ctx, dpr, size } = card;
    const cw = size * dpr;   // canvas width/height in device pixels
    const ch = size * dpr;

    ctx.clearRect(0, 0, cw, ch);

    const skinScale = card.skin.scale ?? 1;
    const anchorOff = card.skin.anchorOffsetY ?? 0;
    const frameW = card.skin.defaultSize.w;
    const frameH = card.skin.defaultSize.h;

    // "Combat size" — the intended visual size used in battle
    const combatW = frameW * skinScale;
    const combatH = frameH * skinScale;

    // Fit combat size into 80% of card, preserving aspect ratio
    const fitScale = Math.min((cw * 0.8) / combatW, (ch * 0.8) / combatH);
    const dw = combatW * fitScale;
    const dh = combatH * fitScale;

    // Center horizontally
    const dx = (cw - dw) / 2;

    // Ground line at 92% of card height; anchor feet there + 10px nudge
    const groundY = ch * 0.92;
    const dy = groundY - dh + dh * anchorOff + 10 * dpr;

    card.engine.drawFrame(ctx, dx, dy, dw, dh, false);
  }

  // -- Skill viewer (fullscreen overlay) ------------------

  _buildSkillEntries(): SkillEntry[] {
    const entries: SkillEntry[] = [];
    for (const skill of Object.values(ACTIVE_SKILLS)) {
      // Derive base directory from spritePath: "skils_sprites/fire/fireball/fireball_sprite.json"
      // We need to replace the filename path with variant subdirectory paths
      const parts = skill.spritePath.split("/");
      const fileName = parts[parts.length - 1]; // "fire_sprite.json"
      const baseDir = parts.slice(0, -1).join("/"); // "skils_sprites/fire_srpite"

      const variants = SKILL_VARIANTS.map(v => ({
        suffix: v.suffix,
        label: v.label,
        jsonPath: `/assets/${baseDir}/${v.suffix}/${fileName}`,
      }));

      entries.push({ id: skill.id, name: skill.name, variants });
    }
    return entries;
  }

  _openSkillViewer(): void {
    if (this._skillOverlay) return;

    const dpr = window.devicePixelRatio || 1;
    this._skillDpr = dpr;
    this._skillEntries = this._buildSkillEntries();
    this._skillIndex = 0;
    this._skillVariantIndex = 0;
    this._skillOpen = true;
    this._skillLoaded = false;
    this._skillAutoTimer = 0;

    const overlay = document.createElement("div");
    overlay.className = "sb-loc-fullscreen screen";
    overlay.innerHTML = `
      <!-- Top bar — skill name + variant cycling -->
      <div class="hud">
        <button class="hud-flee-btn" id="sb-skill-close">&larr;</button>
        <div class="hud-center">
          <button class="sb-loc-hud-arrow" id="sb-skill-prev">&#x276E;</button>
          <span class="stage-display" id="sb-skill-title">&mdash;</span>
          <button class="sb-loc-hud-arrow" id="sb-skill-next">&#x276F;</button>
        </div>
        <span class="sb-loc-counter" id="sb-skill-counter"></span>
      </div>

      <!-- Battle scene area -->
      <div class="battle-scene" id="sb-skill-battle">
        <canvas class="scene-canvas" id="sb-skill-canvas"></canvas>
      </div>

      <!-- Action bar — mirrors real combat layout -->
      <div class="action-bar">
        <div class="action-bar__abilities">
          <button class="action-slot action-slot--ability" id="sb-skill-slot0" data-slot="0">
            <span class="action-slot__key">1</span>
            <div class="action-slot__cooldown"></div>
          </button>
          <button class="action-slot action-slot--ability action-slot--empty" data-slot="1">
            <span class="action-slot__key">2</span>
            <div class="action-slot__cooldown"></div>
          </button>
          <button class="action-slot action-slot--ability action-slot--empty" data-slot="2">
            <span class="action-slot__key">3</span>
            <div class="action-slot__cooldown"></div>
          </button>
          <button class="action-slot action-slot--ability action-slot--empty" data-slot="3">
            <span class="action-slot__key">4</span>
            <div class="action-slot__cooldown"></div>
          </button>
        </div>
        <div class="action-bar__bottom">
          <div class="action-bar__stats">
            <div class="action-bar__hp-bar">
              <div class="action-bar__hp-fill" style="width:100%"></div>
              <span class="action-bar__hp-text">100 / 100</span>
            </div>
            <div class="action-bar__defense">
              <div class="sb-skill-variant-row">
                <button class="sb-skill-variant-arrow" id="sb-skill-vprev">&#x276E;</button>
                <span class="sb-skill-variant-label" id="sb-skill-variant">Original</span>
                <button class="sb-skill-variant-arrow" id="sb-skill-vnext">&#x276F;</button>
              </div>
            </div>
          </div>
          <div class="action-bar__potions">
            <button class="action-slot action-slot--potion action-slot--empty">
              <span class="action-slot__key">Q</span>
              <span class="action-slot__count"></span>
              <div class="action-slot__cooldown"></div>
            </button>
            <button class="action-slot action-slot--potion action-slot--empty">
              <span class="action-slot__key">E</span>
              <span class="action-slot__count"></span>
              <div class="action-slot__cooldown"></div>
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(overlay);
    this._skillOverlay = overlay;
    this._skillCanvas = overlay.querySelector("#sb-skill-canvas") as HTMLCanvasElement;
    this._skillTitleEl = overlay.querySelector("#sb-skill-title");
    this._skillCounterEl = overlay.querySelector("#sb-skill-counter");
    this._skillVariantEl = overlay.querySelector("#sb-skill-variant");

    // Wire buttons
    overlay.querySelector("#sb-skill-close")!.addEventListener("click", () => this._closeSkillViewer());

    // Skill switching (prev/next skill)
    overlay.querySelector("#sb-skill-prev")!.addEventListener("click", () => {
      this._skillIndex = (this._skillIndex - 1 + this._skillEntries.length) % this._skillEntries.length;
      this._skillVariantIndex = 0;
      this._reloadSkillProjectile();
    });
    overlay.querySelector("#sb-skill-next")!.addEventListener("click", () => {
      this._skillIndex = (this._skillIndex + 1) % this._skillEntries.length;
      this._skillVariantIndex = 0;
      this._reloadSkillProjectile();
    });

    // Variant cycling
    overlay.querySelector("#sb-skill-vprev")!.addEventListener("click", () => {
      const entry = this._skillEntries[this._skillIndex];
      if (!entry) return;
      this._skillVariantIndex = (this._skillVariantIndex - 1 + entry.variants.length) % entry.variants.length;
      this._reloadSkillProjectile();
    });
    overlay.querySelector("#sb-skill-vnext")!.addEventListener("click", () => {
      const entry = this._skillEntries[this._skillIndex];
      if (!entry) return;
      this._skillVariantIndex = (this._skillVariantIndex + 1) % entry.variants.length;
      this._reloadSkillProjectile();
    });

    // Ability slot 0 fires the skill
    overlay.querySelector("#sb-skill-slot0")!.addEventListener("click", () => this._fireSkillProjectile());

    // Size canvas
    const battleEl = overlay.querySelector("#sb-skill-battle") as HTMLElement;
    this._skillResizeObserver = new ResizeObserver(() => {
      this._resizeSkillCanvas();
      if (this._skillBg) (this._skillBg as any)._dirty = true;
    });
    this._skillResizeObserver.observe(battleEl);

    requestAnimationFrame(() => {
      this._resizeSkillCanvas();
      this._updateSkillInfo();
    });

    this._loadSkillScene();
    this._ensureTick();
  }

  _closeSkillViewer(): void {
    this._skillOpen = false;

    if (this._skillHero) { this._skillHero.destroy(); this._skillHero = null; }
    if (this._skillEnemy) { this._skillEnemy.destroy(); this._skillEnemy = null; }
    if (this._skillBg) { this._skillBg.destroy(); this._skillBg = null; }
    if (this._skillProjectileLayer) { this._skillProjectileLayer.destroy(); this._skillProjectileLayer = null; }

    if (this._skillResizeObserver) {
      this._skillResizeObserver.disconnect();
      this._skillResizeObserver = null;
    }
    if (this._skillOverlay) {
      this._skillOverlay.remove();
      this._skillOverlay = null;
    }
    this._skillCanvas = null;
    this._skillTitleEl = null;
    this._skillCounterEl = null;
    this._skillVariantEl = null;
    this._skillLoaded = false;

    this._ensureTick();
  }

  _resizeSkillCanvas(): void {
    if (!this._skillCanvas || !this._skillOverlay) return;
    const battleEl = this._skillOverlay.querySelector("#sb-skill-battle") as HTMLElement | null;
    if (!battleEl) return;
    const rect = battleEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = this._skillDpr;

    this._skillCanvas.width = rect.width * dpr;
    this._skillCanvas.height = rect.height * dpr;
    this._skillCanvasW = rect.width;
    this._skillCanvasH = rect.height;

    if (this._skillBg) (this._skillBg as any)._dirty = true;
  }

  _updateSkillInfo(): void {
    const entry = this._skillEntries[this._skillIndex];
    if (!entry) return;

    if (this._skillTitleEl) {
      this._skillTitleEl.textContent = entry.name;
    }
    if (this._skillCounterEl) {
      this._skillCounterEl.textContent = `${this._skillIndex + 1}/${this._skillEntries.length}`;
    }
    if (this._skillVariantEl) {
      const variant = entry.variants[this._skillVariantIndex];
      this._skillVariantEl.textContent = variant ? variant.label : "";
    }

    // Update ability slot 0 icon (first frame of current variant)
    if (this._skillOverlay && this._skillProjectileLayer) {
      const slot0 = this._skillOverlay.querySelector("#sb-skill-slot0") as HTMLElement | null;
      if (slot0) {
        const oldIcon = slot0.querySelector(".ability-icon");
        if (oldIcon) oldIcon.remove();

        const iconCanvas = this._skillProjectileLayer.getIcon(entry.id, 28);
        if (iconCanvas) {
          iconCanvas.className = "ability-icon";
          iconCanvas.style.width = "28px";
          iconCanvas.style.height = "28px";
          iconCanvas.style.imageRendering = "pixelated";
          iconCanvas.style.pointerEvents = "none";
          slot0.prepend(iconCanvas);
        }
      }
    }
  }

  async _loadSkillScene(): Promise<void> {
    try {
      // Hero + enemy + background
      const heroIds = listHeroSkins();
      const enemyIds = listEnemySkins();
      const heroSkin = getHeroSkin(heroIds[0])!;
      const enemySkin = getEnemySkin(enemyIds[0])!;

      this._skillHero = new HeroCharacter(heroSkin);
      this._skillEnemy = new EnemyCharacter(enemySkin);
      this._skillBg = new BackgroundRenderer();
      this._skillProjectileLayer = new ProjectileLayer();

      const bgImages = ACT_BACKGROUNDS[1] || [];
      const bgSrc = bgImages.length > 0 ? bgImages[0] : null;

      await Promise.all([
        this._skillHero.load(),
        this._skillEnemy.load(),
        this._skillBg.load(bgSrc),
      ]);

      this._skillHero.play("idle");
      this._skillEnemy.play("idle");

      // Load current skill projectile
      await this._loadCurrentProjectile();

      this._skillLoaded = true;
      this._updateSkillInfo();
    } catch (err) {
      console.warn("[Storybook] Failed to load skill scene:", err);
    }
  }

  async _loadCurrentProjectile(): Promise<void> {
    if (!this._skillProjectileLayer) return;

    const entry = this._skillEntries[this._skillIndex];
    if (!entry) return;

    const variant = entry.variants[this._skillVariantIndex];
    if (!variant) return;

    // Destroy old sprites and create fresh layer
    this._skillProjectileLayer.destroy();
    this._skillProjectileLayer = new ProjectileLayer();

    await this._skillProjectileLayer.load(entry.id, variant.jsonPath);
  }

  async _reloadSkillProjectile(): Promise<void> {
    await this._loadCurrentProjectile();
    this._updateSkillInfo();
    // Auto-fire after switching
    this._fireSkillProjectile();
  }

  _fireSkillProjectile(): void {
    if (!this._skillProjectileLayer || !this._skillLoaded) return;

    const entry = this._skillEntries[this._skillIndex];
    if (!entry) return;

    const w = this._skillCanvas!.width;
    const h = this._skillCanvas!.height;
    const dpr = this._skillDpr;

    // Hero center
    const heroX = w * 0.18 + 20 * dpr;
    const heroY = h * 0.78;

    // Enemy center
    const enemyX = w * 0.82 - 20 * dpr;
    const enemyY = h * 0.78;

    // Hero attack anim
    if (this._skillHero) {
      this._skillHero.attack();
    }

    this._skillProjectileLayer.launch(entry.id, heroX, heroY, enemyX, enemyY, () => {
      // On impact — shake enemy
      if (this._skillEnemy) this._skillEnemy.hit();
    });
  }

  _updateSkillScene(dt: number): void {
    if (!this._skillLoaded) return;

    if (this._skillHero) this._skillHero.update(dt);
    if (this._skillEnemy) this._skillEnemy.update(dt);
    if (this._skillProjectileLayer) this._skillProjectileLayer.update(dt);

    // Auto-fire every 2.5 seconds
    this._skillAutoTimer += dt;
    if (this._skillAutoTimer >= 2.5) {
      this._skillAutoTimer = 0;
      this._fireSkillProjectile();
    }
  }

  _drawSkillScene(): void {
    if (!this._skillCanvas || !this._skillLoaded) return;

    const ctx = this._skillCanvas.getContext("2d")!;
    const w = this._skillCanvas.width;
    const h = this._skillCanvas.height;
    const dpr = this._skillDpr;

    ctx.clearRect(0, 0, w, h);

    // 1. Background
    if (this._skillBg) {
      this._skillBg.draw(ctx, w, h);
    }

    // 2. Hero (left, 18%)
    if (this._skillHero) {
      this._skillHero.draw(ctx, w, h, dpr);
    }

    // 3. Projectiles
    if (this._skillProjectileLayer) {
      this._skillProjectileLayer.draw(ctx, dpr, w, h);
    }

    // 4. Enemy (right, 82%)
    if (this._skillEnemy) {
      this._skillEnemy.draw(ctx, w, h, dpr);
    }
  }

  // -- Cleanup --------------------------------------------

  _destroyGroupCards(catId: string): void {
    const g = this._groups.get(catId);
    if (!g) return;

    for (const card of g.cards) {
      if (card.engine) card.engine.destroy();
    }

    g.cards = [];
    g.listEl.innerHTML = "";
    g.loaded = false;
  }

  _destroyAll(): void {
    for (const [catId] of this._groups) {
      this._destroyGroupCards(catId);
    }
    this._groups.clear();
    this._closeLocationViewer();
    this._closeSkillViewer();
  }
}
