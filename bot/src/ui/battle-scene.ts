import { BackgroundRenderer } from "./background-renderer.js";
import { HeroCharacter } from "./characters/hero-character.js";
import { EnemyCharacter } from "./characters/enemy-character.js";
import { getHeroSkin, getEnemySkin, getSkinForMonster, resolveEnemySkin } from "../data/sprite-registry.js";
import type { Monster, Rarity, SkinConfig } from "../types.js";

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

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface BattleSceneOpts {
  heroSkin?: string;
  enemySkin?: string;
  backgroundSrc?: string | null;
}

interface DamageData {
  damage: number;
  isCrit: boolean;
  monster: Monster;
}

interface WaveProgressData {
  current: number;
  total: number;
}

interface EnemyAttackData {
  dodged: boolean;
  blocked?: boolean;
  damage: number;
}

interface PlayerHpData {
  hp: number;
  maxHp: number;
}

export class BattleScene {
  container: HTMLElement;
  events: EventBus;

  // DOM refs
  monsterInfoEl: HTMLElement | null;
  hpBarFill: HTMLElement | null;
  hpText: HTMLElement | null;
  monsterNameEl: HTMLElement | null;
  sceneCanvas: HTMLCanvasElement | null;
  _ctx: CanvasRenderingContext2D | null;

  // Characters (created in _tryLoadSprites)
  hero: HeroCharacter | null;
  enemy: EnemyCharacter | null;
  bgRenderer: BackgroundRenderer | null;
  useSprites: boolean;

  // Skin IDs (can be changed before _tryLoadSprites)
  _heroSkinId: string;
  _enemySkinId: string;

  // Background image for this location
  _backgroundSrc: string | null;

  // Render state
  _tickTimer: ReturnType<typeof setTimeout> | null;
  _currentStage: number;
  _canvasW: number;
  _canvasH: number;
  _dpr: number;

  // Entrance animation (hero runs, camera pans)
  _entranceActive: boolean;
  _entranceElapsed: number;
  _entranceDuration: number;

  // Wave progress (from CombatManager via events)
  _totalMonsters: number;
  _currentMonsterIndex: number;

  // ResizeObserver
  _resizeObserver?: ResizeObserver;

  /** Resolves when all sprite assets (hero, enemy, background) are loaded. */
  readonly spritesReady: Promise<void>;

  /**
   * @param container
   * @param events — EventBus instance
   * @param opts
   */
  constructor(container: HTMLElement, events: EventBus, opts: BattleSceneOpts = {}) {
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
    this.spritesReady = this._tryLoadSprites();
  }

  // ─── DOM Setup ──────────────────────────────────────────

  _init(): void {
    this.container.innerHTML = `
      <canvas class="scene-canvas hidden" id="scene-canvas"></canvas>

      <div class="monster-info hidden" id="monster-info">
        <div class="monster-name" id="monster-name"></div>
        <div class="hp-bar-container">
          <div class="hp-bar-fill" id="hp-bar"></div>
          <span class="hp-text" id="hp-text"></span>
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

  async _tryLoadSprites(): Promise<void> {
    try {
      // Capture the skin ID at call time — _enemySkinId may change while we await
      const initialEnemySkinId = this._enemySkinId;

      const heroSkin = getHeroSkin(this._heroSkinId) as SkinConfig | undefined;
      const enemySkin = getEnemySkin(initialEnemySkinId) as SkinConfig | undefined;

      if (!heroSkin) throw new Error(`Hero skin not found: ${this._heroSkinId}`);
      if (!enemySkin) throw new Error(`Enemy skin not found: ${initialEnemySkinId}`);

      this.hero = new HeroCharacter(heroSkin);
      this.enemy = new EnemyCharacter(enemySkin);
      this.bgRenderer = new BackgroundRenderer();

      await Promise.all([
        this.hero.load(),
        this.enemy.load(),
        this.bgRenderer.load(this._backgroundSrc),
      ]);

      this.useSprites = true;

      // Show canvas
      this.sceneCanvas!.classList.remove("hidden");
      this._resizeCanvas();
      this._ctx = this.sceneCanvas!.getContext("2d");

      // Background
      this.bgRenderer.setStage(this._currentStage);

      // If the desired enemy skin changed while we were loading (e.g. monsterSpawned
      // arrived during the await), reload with the correct skin now.
      if (this._enemySkinId !== initialEnemySkinId) {
        const correctSkin = getEnemySkin(this._enemySkinId) as SkinConfig | undefined;
        if (correctSkin) {
          this.enemy = new EnemyCharacter(correctSkin);
          await this.enemy.load();
          console.log(`[BattleScene] Skin changed during load: ${initialEnemySkinId} → ${this._enemySkinId}`);
        }
      }

      // Start idle
      this.hero.play("idle");
      this.enemy.play("idle");

      // Draw first frame
      this._drawFrame();

      // Start tick
      this._startTick();

      // Resize
      this._resizeObserver = new ResizeObserver(() => {
        this._resizeCanvas();
        this._ctx = this.sceneCanvas!.getContext("2d");
        this.bgRenderer!._dirty = true;
        this._drawFrame();
      });
      this._resizeObserver.observe(this.container);

      console.log(`[BattleScene] Loaded hero=${heroSkin.name}, enemy=${this.enemy ? this._enemySkinId : "none"}`);
    } catch (err) {
      this.useSprites = false;
      this.hero = null;
      this.enemy = null;
      this.bgRenderer = null;
      console.error("[BattleScene] Sprites not available:", err);
      console.error("[BattleScene] heroSkinId:", this._heroSkinId, "enemySkinId:", this._enemySkinId);
    }
  }

  // ─── Canvas ─────────────────────────────────────────────

  _resizeCanvas(): void {
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

  _startTick(): void {
    const TICK_MS = 80;
    let lastTime = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.2);
      lastTime = now;

      // Update characters
      this.hero!.update(dt);
      this.enemy!.update(dt);

      // Hide monster info when enemy fades out
      if (!this.enemy!.visible) {
        this.monsterInfoEl!.classList.add("hidden");
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

          // Signal server to start/resume enemy attacks
          console.log("[BattleScene] Entrance complete — emitting entranceDone");
          this.events.emit("entranceDone", {});
        }

        this._drawFrame();
      } else if (panning || this.hero!.needsRedraw || this.enemy!.needsRedraw) {
        // Normal redraw (outside entrance, or camera still finishing)
        this.hero!.clearRedraw();
        this.enemy!.clearRedraw();
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
  _drawFrame(): void {
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

  _listen(): void {
    this.events.on("damage", (data: DamageData) => {
      this._onDamage(data);
    });

    this.events.on("monsterDied", () => {
      this._onMonsterDied();
    });

    this.events.on("monsterSpawned", (monster: Monster) => {
      this._onMonsterSpawned(monster);
    });

    this.events.on("locationWaveProgress", ({ current, total }: WaveProgressData) => {
      this._currentMonsterIndex = current;
      this._totalMonsters = total;
    });

    this.events.on("enemyAttack", (data: EnemyAttackData) => {
      this._onEnemyAttack(data);
    });

    this.events.on("playerHpChanged", (data: PlayerHpData) => {
      this._updatePlayerHp(data.hp, data.maxHp);
    });

    this.events.on("playerDied", () => {
      this._onPlayerDied();
    });
  }

  _onDamage(data: DamageData): void {
    // Cancel entrance if player attacks during it
    if (this._entranceActive) {
      this._entranceActive = false;
      this._entranceElapsed = 0;
      // Snap camera to target position immediately
      if (this.bgRenderer) {
        this.bgRenderer.snapCamera(this.bgRenderer._targetCameraX);
      }
      // Signal server to start/resume enemy attacks
      this.events.emit("entranceDone", {});
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

  _onMonsterDied(): void {
    if (this.useSprites && this.enemy) {
      this.enemy.die();
    }
  }

  _onMonsterSpawned(monster: Monster): void {
    // Rarity label + color
    const rarity: Rarity = monster.rarity;
    if (rarity && rarity.id !== "common") {
      this.monsterNameEl!.textContent = `[${rarity.label}] ${monster.name}`;
    } else {
      this.monsterNameEl!.textContent = monster.name;
    }

    // Apply rarity CSS class
    this.monsterNameEl!.className = "monster-name";
    if (rarity) {
      this.monsterNameEl!.classList.add(`rarity-${rarity.id}`);
    }

    // Apply rarity tint to HP bar
    this.hpBarFill!.className = "hp-bar-fill";
    if (rarity) {
      this.hpBarFill!.classList.add(`hp-rarity-${rarity.id}`);
    }

    this._updateHp(monster);
    this.monsterInfoEl!.classList.remove("hidden");

    // Resolve the correct skin + variant for this monster
    const targetSkinId = resolveEnemySkin(monster.skinId || "", monster.skinVariant || "", monster.name);

    // Always track desired skin — _tryLoadSprites picks it up if still loading
    this._enemySkinId = targetSkinId;

    // Swap enemy sprite if skin changed (non-blocking: load in background)
    if (this.useSprites && this.enemy) {
      const currentSkinId = this.enemy.skinId || "";
      if (targetSkinId !== currentSkinId) {
        const newSkin = getEnemySkin(targetSkinId) as SkinConfig | undefined;
        if (newSkin) {
          const fresh = new EnemyCharacter(newSkin);
          fresh.load().then(() => {
            // Only apply if we haven't moved to yet another skin
            if (this._enemySkinId === targetSkinId) {
              this.enemy = fresh;
              this.enemy.play("idle");
              this.enemy.spawn();
            }
          }).catch(() => {
            console.warn(`[BattleScene] Failed to load skin: ${targetSkinId}`);
          });
        }
      }
    }

    if (this.useSprites && this.enemy) {
      this.enemy.spawn();
      this._startEntrance();
    } else {
      // No sprites yet — skip entrance, signal server immediately.
      // _tryLoadSprites will pick up the correct _enemySkinId when it finishes.
      console.log("[BattleScene] No sprites — skipping entrance, emitting entranceDone");
      this.events.emit("entranceDone", {});
    }
  }

  /**
   * Begin entrance choreography: hero runs, camera pans to new position.
   */
  _startEntrance(): void {
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

  _updateHp(monster: Monster): void {
    const pct = Math.max(0, (monster.currentHp / monster.maxHp) * 100);
    this.hpBarFill!.style.width = `${pct}%`;
    this.hpText!.textContent = `${Math.max(0, Math.ceil(monster.currentHp))}/${monster.maxHp}`;
  }

  // ─── Enemy Attack Visuals ─────────────────────────────────

  _onEnemyAttack(data: EnemyAttackData): void {
    if (data.dodged || data.blocked) return;

    // Skip attack visuals during entrance (hero still running)
    if (this._entranceActive) return;

    const applyHit = (): void => {
      if (this.hero) this.hero.shake(4);
    };

    // Enemy plays a random attack animation if available
    if (this.useSprites && this.enemy) {
      const attacks = [...this.enemy.engine.anims.keys()].filter(n => n.startsWith("attack_"));
      if (attacks.length > 0) {
        const pick = attacks[Math.floor(Math.random() * attacks.length)];
        this.enemy.play(pick, {
          onComplete: () => {
            this.enemy!.play("idle");
            applyHit();
          },
        });
        return;
      }
    }

    // No attack animation — delay hit by 500ms
    setTimeout(applyHit, 500);
  }

  _updatePlayerHp(hp: number, maxHp: number): void {
    const hpFill = document.querySelector("#player-hp-fill") as HTMLElement | null;
    const hpText = document.querySelector("#player-hp-text") as HTMLElement | null;
    if (hpFill) {
      const pct = Math.max(0, (hp / maxHp) * 100);
      hpFill.style.width = `${pct}%`;
    }
    if (hpText) {
      hpText.textContent = `${Math.max(0, hp)} / ${maxHp}`;
    }
  }

  _onPlayerDied(): void {
    if (this.useSprites && this.hero) {
      if (this.hero.engine.hasAnimation("death")) {
        this.hero.play("death", {
          onComplete: () => this.hero!.startDeath(),
        });
      } else {
        this.hero.startDeath();
      }
    }
  }

  // ─── Cleanup ────────────────────────────────────────────

  destroy(): void {
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
