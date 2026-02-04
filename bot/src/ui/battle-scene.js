import { BackgroundRenderer } from "./background-renderer.js";
import { HeroCharacter } from "./characters/hero-character.js";
import { EnemyCharacter } from "./characters/enemy-character.js";
import { getHeroSkin, getEnemySkin } from "../data/sprite-registry.js";

/**
 * BattleScene — renders the battle area.
 *
 * Orchestrates:
 *  - BackgroundRenderer (static image)
 *  - HeroCharacter (left side, player-controlled)
 *  - EnemyCharacter (right side, monster)
 *  - Monster info DOM overlay (name + HP bar)
 *
 * Character logic (entrance, death, shake, draw) is fully encapsulated
 * inside Character subclasses. BattleScene only calls high-level methods.
 *
 * Full-redraw every frame: background → hero → enemy. No partial clears.
 */
export class BattleScene {
  /**
   * @param {HTMLElement} container
   * @param {Object} events — EventBus instance
   * @param {Object} [opts]
   * @param {string} [opts.heroSkin="samurai_1"]  — hero skin ID from registry
   * @param {string} [opts.enemySkin="goblin_black"] — enemy skin ID from registry
   * @param {string} [opts.backgroundSrc] — background image path for this location
   */
  constructor(container, events, opts = {}) {
    this.container = container;
    this.events = events;

    // DOM refs
    this.monsterInfoEl = null;
    this.hpBarFill = null;
    this.hpText = null;
    this.monsterNameEl = null;
    this.sceneCanvas = null;
    this._ctx = null;

    // Characters (created in _tryLoadSprites)
    this.hero = null;
    this.enemy = null;
    this.bgRenderer = null;
    this.useSprites = false;

    // Skin IDs (can be changed before _tryLoadSprites)
    this._heroSkinId = opts.heroSkin || "samurai_1";
    this._enemySkinId = opts.enemySkin || "goblin_black";

    // Background image for this location
    this._backgroundSrc = opts.backgroundSrc || null;

    // Render state
    this._tickTimer = null;
    this._currentStage = 1;
    this._canvasW = 0;
    this._canvasH = 0;
    this._dpr = 1;

    // Entrance animation (hero runs, camera pans)
    this._entranceActive = false;
    this._entranceElapsed = 0;
    this._entranceDuration = 1.2;     // seconds (longer hero run)

    // Wave progress (from CombatManager via events)
    this._totalMonsters = 0;
    this._currentMonsterIndex = 0;

    this._init();
    this._listen();
    this._tryLoadSprites();
  }

  // ─── DOM Setup ──────────────────────────────────────────

  _init() {
    this.container.innerHTML = `
      <canvas class="scene-canvas hidden" id="scene-canvas"></canvas>

      <div class="battle-loading" id="battle-loading">
        <div class="battle-loading__spinner"></div>
        <div class="battle-loading__text">Loading...</div>
      </div>

      <div class="monster-info" id="monster-info">
        <div class="monster-name" id="monster-name">Goblin</div>
        <div class="hp-bar-container">
          <div class="hp-bar-fill" id="hp-bar"></div>
          <span class="hp-text" id="hp-text">10/10</span>
        </div>
      </div>

      <div class="effects-layer" id="effects-layer"></div>
    `;

    this.monsterInfoEl = this.container.querySelector("#monster-info");
    this.hpBarFill = this.container.querySelector("#hp-bar");
    this.hpText = this.container.querySelector("#hp-text");
    this.monsterNameEl = this.container.querySelector("#monster-name");
    this.sceneCanvas = this.container.querySelector("#scene-canvas");
  }

  // ─── Sprite Loading ─────────────────────────────────────

  async _tryLoadSprites() {
    try {
      const heroSkin = getHeroSkin(this._heroSkinId);
      const enemySkin = getEnemySkin(this._enemySkinId);

      if (!heroSkin) throw new Error(`Hero skin not found: ${this._heroSkinId}`);
      if (!enemySkin) throw new Error(`Enemy skin not found: ${this._enemySkinId}`);

      this.hero = new HeroCharacter(heroSkin);
      this.enemy = new EnemyCharacter(enemySkin);
      this.bgRenderer = new BackgroundRenderer();

      await Promise.all([
        this.hero.load(),
        this.enemy.load(),
        this.bgRenderer.load(this._backgroundSrc),
      ]);

      this.useSprites = true;

      // Hide loading screen
      const loadingEl = this.container.querySelector("#battle-loading");
      if (loadingEl) loadingEl.classList.add("hidden");

      // Show canvas
      this.sceneCanvas.classList.remove("hidden");
      this._resizeCanvas();
      this._ctx = this.sceneCanvas.getContext("2d");

      // Background
      this.bgRenderer.setStage(this._currentStage);

      // Initial animations
      this.hero.play("idle");
      this.enemy.play("idle");

      // Draw first frame
      this._drawFrame();

      // Start tick
      this._startTick();

      // Resize
      this._resizeObserver = new ResizeObserver(() => {
        this._resizeCanvas();
        this._ctx = this.sceneCanvas.getContext("2d");
        this.bgRenderer._dirty = true;
        this._drawFrame();
      });
      this._resizeObserver.observe(this.container);

      console.log(`[BattleScene] Loaded hero=${heroSkin.name}, enemy=${enemySkin.name}`);
    } catch (err) {
      this.useSprites = false;
      this.hero = null;
      this.enemy = null;
      this.bgRenderer = null;
      // Show error in loading area
      const loadingEl = this.container.querySelector("#battle-loading");
      if (loadingEl) {
        const textEl = loadingEl.querySelector(".battle-loading__text");
        if (textEl) textEl.textContent = "Failed to load sprites";
        const spinnerEl = loadingEl.querySelector(".battle-loading__spinner");
        if (spinnerEl) spinnerEl.classList.add("hidden");
      }
      console.log("[BattleScene] Sprites not available", err);
    }
  }

  // ─── Canvas ─────────────────────────────────────────────

  _resizeCanvas() {
    if (!this.sceneCanvas) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.sceneCanvas.width = rect.width * dpr;
    this.sceneCanvas.height = rect.height * dpr;
    this.sceneCanvas.style.width = rect.width + "px";
    this.sceneCanvas.style.height = rect.height + "px";

    this._canvasW = rect.width * dpr;
    this._canvasH = rect.height * dpr;
    this._dpr = dpr;
  }

  // ─── Tick Loop ──────────────────────────────────────────

  _startTick() {
    const TICK_MS = 80;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.2);
      lastTime = now;

      // Update characters
      this.hero.update(dt);
      this.enemy.update(dt);

      // Hide monster info when enemy fades out
      if (!this.enemy.visible) {
        this.monsterInfoEl.classList.add("hidden");
      }

      // Camera pan update
      let panning = false;
      if (this.bgRenderer) {
        panning = this.bgRenderer.updateCamera(dt);
      }

      // Entrance choreography: hero runs while camera pans
      if (this._entranceActive) {
        this._entranceElapsed += dt;

        if (this._entranceElapsed >= this._entranceDuration && !panning) {
          // Entrance complete (timer done AND camera settled)
          this._entranceActive = false;
          this._entranceElapsed = 0;
          if (this.hero) this.hero.stopRunning();
        }

        this._drawFrame();
      } else if (panning || this.hero.needsRedraw || this.enemy.needsRedraw) {
        // Normal redraw (outside entrance, or camera still finishing)
        this.hero.clearRedraw();
        this.enemy.clearRedraw();
        this._drawFrame();
      }

      this._tickTimer = setTimeout(tick, TICK_MS);
    };

    this._tickTimer = setTimeout(tick, TICK_MS);
  }

  // ─── Rendering ──────────────────────────────────────────

  /**
   * Full redraw: background → hero → enemy.
   * No partial clears — no artifacts.
   */
  _drawFrame() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const w = this._canvasW;
    const h = this._canvasH;
    const dpr = this._dpr;

    // 1. Background
    ctx.clearRect(0, 0, w, h);
    if (this.bgRenderer) {
      this.bgRenderer.draw(ctx, w, h);
    }

    // 2. Hero
    if (this.hero) {
      this.hero.draw(ctx, w, h, dpr);
    }

    // 3. Enemy
    if (this.enemy) {
      this.enemy.draw(ctx, w, h, dpr);
    }
  }

  // ─── Event Wiring ──────────────────────────────────────

  _listen() {
    this.events.on("damage", (data) => {
      this._onDamage(data);
    });

    this.events.on("passiveDamage", (data) => {
      this._updateHp(data.monster);
    });

    this.events.on("monsterDied", () => {
      this._onMonsterDied();
    });

    this.events.on("monsterSpawned", (monster) => {
      this._onMonsterSpawned(monster);
    });

    this.events.on("locationWaveProgress", ({ current, total }) => {
      this._currentMonsterIndex = current;
      this._totalMonsters = total;
    });

    this.events.on("stageChanged", (data) => {
      this._currentStage = data.stage;
      if (this.bgRenderer) {
        this.bgRenderer.setStage(data.stage);
        this._drawFrame();
      }
    });
  }

  _onDamage(data) {
    // Cancel entrance if player attacks during it
    if (this._entranceActive) {
      this._entranceActive = false;
      this._entranceElapsed = 0;
      // Snap camera to target position immediately
      if (this.bgRenderer) {
        this.bgRenderer.snapCamera(this.bgRenderer._targetCameraX);
      }
    }

    // Hero attacks
    if (this.useSprites && this.hero) {
      this.hero.attack();
    }

    // Enemy shakes
    if (this.enemy) {
      this.enemy.hit();
    }

    this._updateHp(data.monster);
  }

  _onMonsterDied() {
    if (this.useSprites && this.enemy) {
      this.enemy.die();
    }
  }

  _onMonsterSpawned(monster) {
    // Rarity label + color
    const rarity = monster.rarity;
    if (rarity && rarity.id !== "common") {
      this.monsterNameEl.textContent = `[${rarity.label}] ${monster.name}`;
    } else {
      this.monsterNameEl.textContent = monster.name;
    }

    // Apply rarity CSS class
    this.monsterNameEl.className = "monster-name";
    if (rarity) {
      this.monsterNameEl.classList.add(`rarity-${rarity.id}`);
    }

    // Apply rarity tint to HP bar
    this.hpBarFill.className = "hp-bar-fill";
    if (rarity) {
      this.hpBarFill.classList.add(`hp-rarity-${rarity.id}`);
    }

    this._updateHp(monster);
    this.monsterInfoEl.classList.remove("hidden");

    if (this.useSprites && this.enemy) {
      this.enemy.spawn();
      this._startEntrance();
    }
  }

  /**
   * Begin entrance choreography: hero runs, camera pans to new position.
   */
  _startEntrance() {
    this._entranceActive = true;
    this._entranceElapsed = 0;

    // Hero runs in place
    if (this.hero) {
      this.hero.runEntrance();
    }

    // Camera pans based on wave progress
    if (this.bgRenderer && this._totalMonsters > 1) {
      const maxPan = this.bgRenderer.getMaxPan(this._canvasW, this._canvasH);
      const progress = this._currentMonsterIndex / (this._totalMonsters - 1);
      const targetX = maxPan * progress;
      this.bgRenderer.setCameraTarget(targetX);
    }
  }

  _updateHp(monster) {
    const pct = Math.max(0, (monster.currentHp / monster.maxHp) * 100);
    this.hpBarFill.style.width = `${pct}%`;
    this.hpText.textContent = `${Math.max(0, Math.ceil(monster.currentHp))}/${monster.maxHp}`;
  }

  // ─── Cleanup ────────────────────────────────────────────

  destroy() {
    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.hero) this.hero.destroy();
    if (this.enemy) this.enemy.destroy();
    if (this.bgRenderer) this.bgRenderer.destroy();
  }
}
