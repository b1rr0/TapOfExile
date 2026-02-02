import { SpriteEngine } from "../ui/sprite-engine.js";
import { BackgroundRenderer } from "../ui/background-renderer.js";
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

/**
 * StorybookScene — sprite preview with accordion categories.
 *
 * Single scrollable page with category buttons.
 * Click a button → its sprite cards expand below as a dropdown list.
 * Click again (or another) → collapses.
 *
 * Hero demo:  run → idle → attack → idle (loop)
 * Enemy demo: run → idle → death (loop)
 * Locations demo: background + hero + enemy standing together
 */

// ─── Demo phase constants ────────────────────────────────

const PHASE_RUN = 0;
const PHASE_IDLE = 1;
const PHASE_ACTION = 2;
const PHASE_PAUSE = 3;

const PHASE_DURATIONS = {
  [PHASE_RUN]: 1.5,
  [PHASE_IDLE]: 2.0,
  [PHASE_ACTION]: 0,
  [PHASE_PAUSE]: 1.0,
};

// ─── Category definitions ────────────────────────────────

const CATEGORIES = [
  {
    id: "heroes",
    label: "Heroes",
    icon: "\u2694\uFE0F",
    description: "Playable character skins",
    role: "hero",
    getSkins: () => listHeroSkins().map((id) => HERO_SKINS[id]),
  },
  {
    id: "enemies",
    label: "Enemies",
    icon: "\uD83D\uDC79",
    description: "Monster skins",
    role: "enemy",
    getSkins: () => listEnemySkins().map((id) => ENEMY_SKINS[id]),
  },
  {
    id: "locations",
    label: "Locations",
    icon: "\uD83D\uDDFA\uFE0F",
    description: "Background previews with characters",
    role: "location",
    getSkins: () => [], // handled separately
  },
];

// ─── Scene ───────────────────────────────────────────────

export class StorybookScene {
  constructor(container, deps) {
    this.container = container;
    this.sceneManager = deps.sceneManager;

    /** @type {Map<string, {cards: object[], listEl: HTMLElement, open: boolean}>} */
    this._groups = new Map();
    this._rafId = null;
    this._lastTime = 0;

    /** Location fullscreen viewer state */
    this._locScenes = [];
    this._locCanvas = null;
    this._locInfoEl = null;
    this._locOverlay = null;
    this._locResizeObserver = null;
    this._locIndex = 0;
    this._locDpr = 1;
    this._locCanvasW = 0;
    this._locCanvasH = 0;
    this._locOpen = false;
  }

  // ─── Lifecycle ─────────────────────────────────────────

  mount() {
    this.container.innerHTML = `
      <div class="storybook">
        <div class="storybook-header">
          <button class="storybook-back" id="sb-back">&larr; Back</button>
          <span class="storybook-title">SPRITE STORYBOOK</span>
        </div>
        <div class="sb-accordion" id="sb-accordion"></div>
      </div>
    `;

    this.container
      .querySelector("#sb-back")
      .addEventListener("click", () => this.sceneManager.switchTo("hideout"));

    const accordion = this.container.querySelector("#sb-accordion");

    for (const cat of CATEGORIES) {
      this._createGroup(accordion, cat);
    }
  }

  unmount() {
    this._stopTick();
    this._destroyAll();
    this.container.innerHTML = "";
  }

  // ─── Accordion group ──────────────────────────────────

  _createGroup(accordion, category) {
    // Wrapper
    const group = document.createElement("div");
    group.className = "sb-group";

    const count = category.id === "locations"
      ? ACT_DEFINITIONS.length
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

  _toggleGroup(catId) {
    const g = this._groups.get(catId);
    if (!g) return;

    // Locations open as fullscreen overlay — not accordion
    if (catId === "locations") {
      this._openLocationViewer();
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

      const skins = g.category.getSkins();
      for (const skin of skins) {
        this._createCard(g, skin, g.category.role);
      }
      g.loaded = true;
      this._loadGroupCards(catId);
    }

    this._ensureTick();
  }

  // ─── Sprite Card creation ──────────────────────────────

  _createCard(group, skin, role) {
    const card = document.createElement("div");
    card.className = "sb-card";

    const canvas = document.createElement("canvas");
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

    const runAnim = skin.animations.run
      ? "run"
      : skin.animations.walk
        ? "walk"
        : "idle";

    const actionAnim =
      role === "hero"
        ? skin.animations.attack1
          ? "attack1"
          : "idle"
        : skin.animations.death
          ? "death"
          : "idle";

    const cardData = {
      engine,
      canvas,
      ctx: canvas.getContext("2d"),
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

  // ─── Location Viewer (fullscreen overlay) ──────────────

  _openLocationViewer() {
    if (this._locOverlay) return; // already open

    const dpr = window.devicePixelRatio || 1;
    this._locDpr = dpr;
    const heroIds = listHeroSkins();
    const enemyIds = listEnemySkins();

    // Build scene data for each act
    this._locScenes = [];
    for (let i = 0; i < ACT_DEFINITIONS.length; i++) {
      const act = ACT_DEFINITIONS[i];
      const actNum = act.act;
      const bgImages = ACT_BACKGROUNDS[actNum] || [];
      const mods = getActModifiers(actNum);
      const heroSkin = getHeroSkin(heroIds[i % heroIds.length]);
      const enemySkin = getEnemySkin(enemyIds[i % enemyIds.length]);

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
    //   .hud (top bar)  →  .battle-scene (canvas, flex:1)  →  .combat-bottom-bar (info panel)
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
    this._locCanvas = overlay.querySelector("#sb-loc-canvas");
    this._locInfoEl = overlay.querySelector("#sb-loc-desc");
    this._locTitleEl = overlay.querySelector("#sb-loc-title");
    this._locCounterEl = overlay.querySelector("#sb-loc-counter");

    // Wire buttons
    overlay.querySelector("#sb-loc-close").addEventListener("click", () => this._closeLocationViewer());
    overlay.querySelector("#sb-loc-prev").addEventListener("click", () => {
      this._locIndex = (this._locIndex - 1 + this._locScenes.length) % this._locScenes.length;
      this._switchLocScene();
    });
    overlay.querySelector("#sb-loc-next").addEventListener("click", () => {
      this._locIndex = (this._locIndex + 1) % this._locScenes.length;
      this._switchLocScene();
    });

    // Size canvas to match battle-scene container
    const battleEl = overlay.querySelector("#sb-loc-battle");
    this._locResizeObserver = new ResizeObserver(() => {
      this._resizeLocCanvas();
      const sc = this._locScenes[this._locIndex];
      if (sc) sc.bgRenderer._dirty = true;
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

  _closeLocationViewer() {
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

  _resizeLocCanvas() {
    if (!this._locCanvas || !this._locOverlay) return;
    const battleEl = this._locOverlay.querySelector("#sb-loc-battle");
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
      sc.bgRenderer._dirty = true;
    }
  }

  _switchLocScene() {
    this._updateLocInfo();
    const sc = this._locScenes[this._locIndex];
    if (sc) sc.bgRenderer._dirty = true;
  }

  _updateLocInfo() {
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

  async _loadLocationScenes() {
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

  // ─── Loading ──────────────────────────────────────────

  async _loadGroupCards(catId) {
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

  // ─── Tick loop ────────────────────────────────────────

  _ensureTick() {
    // Start tick if any group is open or location viewer is open
    const anyOpen = [...this._groups.values()].some((g) => g.open) || this._locOpen;
    if (anyOpen && !this._rafId) {
      this._startTick();
    } else if (!anyOpen && this._rafId) {
      this._stopTick();
    }
  }

  _startTick() {
    this._lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - this._lastTime) / 1000, 0.2);
      this._lastTime = now;

      // Location fullscreen viewer
      if (this._locOpen) {
        this._updateLocationScene(dt);
        this._drawLocationScene();
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

  _stopTick() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // ─── Phase state machine (sprites) ────────────────────

  _updateCard(card, dt) {
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

  // ─── Location viewer update/draw ───────────────────────

  _updateLocationScene(dt) {
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

  _drawLocationScene() {
    if (!this._locCanvas || !this._locScenes || !this._locScenes.length) return;
    const sc = this._locScenes[this._locIndex];
    if (!sc || !sc.loaded) return;

    const dpr = this._locDpr;
    const cw = this._locCanvas.width;
    const ch = this._locCanvas.height;
    const ctx = this._locCanvas.getContext("2d");

    ctx.clearRect(0, 0, cw, ch);

    // 1. Background
    sc.bgRenderer.draw(ctx, cw, ch);

    // 2. Hero (left side, ~25% from left, feet at 90%)
    if (sc.heroEngine.loaded) {
      const hs = sc.heroSkin.defaultSize;
      const charScale = (ch * 0.65) / hs.h;
      const dw = hs.w * charScale;
      const dh = hs.h * charScale;
      const dx = cw * 0.20 - dw / 2;
      const dy = ch * 0.90 - dh;
      sc.heroEngine.drawFrame(ctx, dx, dy, dw, dh, false);
    }

    // 3. Enemy (right side, flipped, ~75% from left, feet at 90%)
    if (sc.enemyEngine.loaded) {
      const es = sc.enemySkin.defaultSize;
      const charScale = (ch * 0.65) / es.h;
      const dw = es.w * charScale;
      const dh = es.h * charScale;
      const dx = cw * 0.75 - dw / 2;
      const dy = ch * 0.90 - dh;
      sc.enemyEngine.drawFrame(ctx, dx, dy, dw, dh, true);
    }
  }

  // ─── Drawing (sprites) ────────────────────────────────

  _drawCard(card) {
    if (!card.engine.needsRedraw) return;
    card.engine.needsRedraw = false;

    const { ctx, dpr, size } = card;
    const w = size * dpr;
    const h = size * dpr;

    ctx.clearRect(0, 0, w, h);

    const frameW = card.skin.defaultSize.w;
    const frameH = card.skin.defaultSize.h;
    const scale = Math.min((w * 0.8) / frameW, (h * 0.8) / frameH);
    const dw = frameW * scale;
    const dh = frameH * scale;
    const dx = (w - dw) / 2;
    const dy = h - dh - h * 0.05;

    card.engine.drawFrame(ctx, dx, dy, dw, dh, false);
  }

  // ─── Cleanup ──────────────────────────────────────────

  _destroyGroupCards(catId) {
    const g = this._groups.get(catId);
    if (!g) return;

    for (const card of g.cards) {
      if (card.engine) card.engine.destroy();
    }

    g.cards = [];
    g.listEl.innerHTML = "";
    g.loaded = false;
  }

  _destroyAll() {
    for (const [catId] of this._groups) {
      this._destroyGroupCards(catId);
    }
    this._groups.clear();
    this._closeLocationViewer();
  }
}
