import { SpriteEngine } from "../ui/sprite-engine.js";
import {
  HERO_SKINS,
  ENEMY_SKINS,
  listHeroSkins,
  listEnemySkins,
} from "../data/sprite-registry.js";

/**
 * StorybookScene — sprite preview with accordion categories.
 *
 * Single scrollable page with category buttons.
 * Click a button → its sprite cards expand below as a dropdown list.
 * Click again (or another) → collapses.
 *
 * Hero demo:  run → idle → attack → idle (loop)
 * Enemy demo: run → idle → death (loop)
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

    // Toggle button
    const btn = document.createElement("button");
    btn.className = "sb-group__btn";
    btn.innerHTML = `
      <span class="sb-group__icon">${category.icon}</span>
      <span class="sb-group__label">${category.label}</span>
      <span class="sb-group__count">${category.getSkins().length}</span>
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

    if (g.open) {
      // Collapse
      g.open = false;
      g.listEl.classList.remove("sb-group__list--open");
      g.btn.classList.remove("sb-group__btn--open");
      // Destroy cards to free memory
      this._destroyGroupCards(catId);
    } else {
      // Expand
      g.open = true;
      g.listEl.classList.add("sb-group__list--open");
      g.btn.classList.add("sb-group__btn--open");
      // Create cards if first open
      if (!g.loaded) {
        const skins = g.category.getSkins();
        for (const skin of skins) {
          this._createCard(g, skin, g.category.role);
        }
        g.loaded = true;
        this._loadGroupCards(catId);
      } else {
        // Re-create cards (were destroyed on collapse)
        const skins = g.category.getSkins();
        for (const skin of skins) {
          this._createCard(g, skin, g.category.role);
        }
        this._loadGroupCards(catId);
      }
    }

    this._ensureTick();
  }

  // ─── Card creation ────────────────────────────────────

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

  // ─── Loading ──────────────────────────────────────────

  async _loadGroupCards(catId) {
    const g = this._groups.get(catId);
    if (!g) return;

    const promises = g.cards.map(async (card) => {
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
    // Start tick if any group is open, stop if all closed
    const anyOpen = [...this._groups.values()].some((g) => g.open);
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

  // ─── Phase state machine ──────────────────────────────

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

  // ─── Drawing ──────────────────────────────────────────

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
      card.engine.destroy();
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
  }
}
