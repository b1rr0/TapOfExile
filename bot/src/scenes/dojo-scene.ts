import { getHeroSkin, getEnemySkin } from "../data/sprite-registry.js";
import { getCharacterClass } from "../data/character-classes.js";
import { HeroCharacter } from "../ui/characters/hero-character.js";
import { EnemyCharacter } from "../ui/characters/enemy-character.js";
import { BackgroundRenderer } from "../ui/background-renderer.js";
import { renderActionBarHTML, initPotionSlots, initKeyboardHandler, initAbilitySlots } from "../ui/action-bar.js";
import { ProjectileLayer } from "../ui/projectile-layer.js";
import { haptic } from "../utils/haptic.js";
import { friends } from "../api.js";
import { getSocket, waitForConnection } from "../combat-socket.js";
import { B } from "../data/balance.js";
import type { Socket } from "socket.io-client";
import type { SharedDeps, SkinConfig } from "../types.js";

const DOJO_BG = "/assets/background/dojo/vecteezy_dojo-illustration_149158.jpg";
const DUMMY_SKIN_ID = "training_dummy";
const COUNTDOWN_SECONDS = B.DOJO_COUNTDOWN_MS / 1000;

/** localStorage key prefix for best DPS per character */
const BEST_KEY_PREFIX = "dojo_best_";

function getBestDamage(charId: string): number {
  try {
    return Number(localStorage.getItem(BEST_KEY_PREFIX + charId)) || 0;
  } catch { return 0; }
}

function saveBestDamage(charId: string, damage: number): void {
  try {
    localStorage.setItem(BEST_KEY_PREFIX + charId, String(damage));
  } catch { /* noop */ }
}

/**
 * DojoScene — training dummy DPS test mode with landing menu + friends leaderboard.
 *
 * Flow (server-authoritative via WebSocket):
 *  1. Landing screen (dojo bg + "Start Challenge" / "Leaderboard" buttons)
 *  2. Connect socket → emit combat:start-dojo → wait for combat:dojo-started
 *  3. 3-second countdown overlay
 *  4. 10-second damage phase (tap → emit combat:tap → server calculates damage → combat:tap-result)
 *  5. Timer expires → emit combat:complete-dojo → combat:dojo-completed with server results
 *  6. Results overlay → back to landing
 */
export class DojoScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  // Canvas rendering
  _canvas: HTMLCanvasElement | null;
  _ctx: CanvasRenderingContext2D | null;
  _hero: HeroCharacter | null;
  _enemy: EnemyCharacter | null;
  _bg: BackgroundRenderer | null;
  _dpr: number;
  _canvasW: number;
  _canvasH: number;
  _tickTimer: ReturnType<typeof setTimeout> | null;
  _resizeObserver: ResizeObserver | null;

  // Game state
  _phase: "landing" | "loading" | "countdown" | "fight" | "results" | "leaderboard";
  _countdownValue: number;
  _countdownTimer: ReturnType<typeof setInterval> | null;
  _serverTimerInterval: ReturnType<typeof setInterval> | null;
  _totalDamage: number;
  _tapCount: number;
  _lastTapTime: number;
  _charId: string;
  _bestDamage: number;
  _spritesLoaded: boolean;
  _heroSkinId: string;

  // Socket state
  _socket: Socket | null;
  _sessionId: string | null;
  _dojoEndsAt: number | null;

  // Leaderboard
  _activeTab: "friends" | "global";

  // DOM refs
  _overlayEl: HTMLElement | null;
  _bestEl: HTMLElement | null;
  _timerEl: HTMLElement | null;
  _dmgEl: HTMLElement | null;
  _tapHandler: ((e: MouseEvent) => void) | null;
  _cleanupKeyboard: (() => void) | null;
  _cleanupPotions: (() => void) | null;
  _cleanupAbilities: (() => void) | null;
  _projectileLayer: ProjectileLayer | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._canvas = null;
    this._ctx = null;
    this._hero = null;
    this._enemy = null;
    this._bg = null;
    this._dpr = 1;
    this._canvasW = 0;
    this._canvasH = 0;
    this._tickTimer = null;
    this._resizeObserver = null;

    this._phase = "landing";
    this._countdownValue = COUNTDOWN_SECONDS;
    this._countdownTimer = null;
    this._serverTimerInterval = null;
    this._totalDamage = 0;
    this._tapCount = 0;
    this._lastTapTime = 0;
    this._charId = "";
    this._bestDamage = 0;
    this._spritesLoaded = false;
    this._heroSkinId = "";
    this._activeTab = "friends";

    this._socket = null;
    this._sessionId = null;
    this._dojoEndsAt = null;

    this._overlayEl = null;
    this._bestEl = null;
    this._timerEl = null;
    this._dmgEl = null;
    this._tapHandler = null;
    this._cleanupKeyboard = null;
    this._cleanupPotions = null;
    this._cleanupAbilities = null;
    this._projectileLayer = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    const char = this.state.getActiveCharacter();
    if (!char) {
      this.sceneManager.switchTo("hideout");
      return;
    }

    this._charId = char.id || "";
    this._bestDamage = getBestDamage(this._charId);
    this._heroSkinId = char.skinId;
    this._spritesLoaded = false;

    this._showLanding();
  }

  // ─── Landing Phase ──────────────────────────────────────

  _showLanding(): void {
    this._phase = "landing";
    this._stopTimers();
    this._cleanupDojoSocket();

    this.container.innerHTML = `
      <div class="dojo-landing" style="background-image: url('${DOJO_BG}')">
        <div class="dojo-landing__header">
          <button class="dojo-back-btn" id="dojo-back">&larr;</button>
          <span class="dojo-landing__title">Dojo</span>
          <span class="dojo-landing__best">${this._bestDamage > 0 ? "Best: " + this._formatDmg(this._bestDamage) : ""}</span>
        </div>
        <div class="dojo-landing__center">
          <button class="dojo-landing__btn dojo-landing__btn--start" id="dojo-start">Start Challenge</button>
          <button class="dojo-landing__btn dojo-landing__btn--top" id="dojo-top">Leaderboard</button>
        </div>
      </div>
    `;

    this.container.querySelector("#dojo-back")!.addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    this.container.querySelector("#dojo-start")!.addEventListener("click", () => {
      this._startChallenge();
    });

    this.container.querySelector("#dojo-top")!.addEventListener("click", () => {
      this._showLeaderboard();
    });
  }

  // ─── Start Challenge (connect socket → load sprites → countdown → fight) ──

  async _startChallenge(): Promise<void> {
    const char = this.state.getActiveCharacter();
    if (!char) return;

    this._totalDamage = 0;
    this._tapCount = 0;
    this._lastTapTime = 0;
    this._countdownValue = COUNTDOWN_SECONDS;
    this._sessionId = null;
    this._dojoEndsAt = null;
    this._phase = "loading";

    this.container.innerHTML = `
      <div class="dojo">
        <div class="dojo-topbar">
          <button class="dojo-back-btn" id="dojo-back">&larr;</button>
          <span class="dojo-title">Dojo</span>
          <span class="dojo-best" id="dojo-best">Best: ${this._bestDamage > 0 ? this._formatDmg(this._bestDamage) : "---"}</span>
        </div>

        <div class="dojo-fight-hud" id="dojo-fight-hud">
          <div class="dojo-timer" id="dojo-timer">--</div>
          <div class="dojo-damage" id="dojo-damage">0</div>
        </div>

        <div class="dojo-arena" id="dojo-arena">
          <canvas class="dojo-canvas" id="dojo-canvas"></canvas>
        </div>

        ${renderActionBarHTML({
          level: char.level || 1,
          xp: char.xp || 0,
          xpToNext: char.xpToNext || 100,
          maxHp: char.maxHp || char.hp || 100,
          hp: char.hp || 100,
          dodgeChance: char.dodgeChance || 0,
          resistance: char.resistance,
        })}

        <div class="dojo-overlay" id="dojo-overlay">
          <div class="dojo-overlay__text" id="dojo-overlay-text">Connecting...</div>
        </div>
      </div>
    `;

    this._bestEl = this.container.querySelector("#dojo-best");
    this._timerEl = this.container.querySelector("#dojo-timer");
    this._dmgEl = this.container.querySelector("#dojo-damage");
    this._overlayEl = this.container.querySelector("#dojo-overlay");
    this._canvas = this.container.querySelector("#dojo-canvas");

    // Back button → landing
    this.container.querySelector("#dojo-back")!.addEventListener("click", () => {
      this._stopTimers();
      this._destroySprites();
      this._cleanupActionBar();
      this._cleanupDojoSocket();
      this._showLanding();
    });

    // Tap handler
    const arena = this.container.querySelector("#dojo-arena") as HTMLElement;
    this._tapHandler = (e: MouseEvent) => {
      e.preventDefault();
      this._onTap();
    };
    arena.addEventListener("click", this._tapHandler);

    // Potions (display-only, no server session in Dojo)
    this._cleanupPotions = initPotionSlots({
      container: this.container,
      equipment: char?.inventory?.equipment || {},
      onUsePotion: null,
      events: null,
    });

    // Keyboard (Space → tap)
    this._cleanupKeyboard = initKeyboardHandler(this.container, {
      onTap: () => this._onTap(),
    });

    // Ability slots — show equipped skills from the skill tree
    {
      let equippedSkills = char.equippedSkills || [null, null, null, null];
      if (equippedSkills.every((s: string | null) => !s) && char.unlockedActiveSkills?.length) {
        equippedSkills = [...char.unlockedActiveSkills.slice(0, 4)];
        while (equippedSkills.length < 4) equippedSkills.push(null);
      }
      if (!this._projectileLayer) this._projectileLayer = new ProjectileLayer();
      initAbilitySlots({
        container: this.container,
        equippedSkills,
        projectileLayer: this._projectileLayer,
        onCastSkill: (skillId) => {
          if (this._socket && this._sessionId) {
            this._socket.emit("combat:cast-skill", { sessionId: this._sessionId, skillId });
          }
        },
        events: this.events,
      }).then((cleanup) => {
        this._cleanupAbilities = cleanup;
      });
    }

    // Refresh stats before starting so action bar and server see same data
    await this.state.refreshState().catch(() => {});

    // Connect socket and request dojo session
    try {
      this._socket = await getSocket();
      await waitForConnection(this._socket);
      this._setupDojoSocketListeners();
      this._socket.emit("combat:start-dojo", {});
    } catch (err) {
      console.error("[DojoScene] Socket connection failed:", err);
      this._showOverlay("Connection failed. Tap to retry.");
      return;
    }

    // Load sprites (or reuse if already loaded with same skin)
    if (this._spritesLoaded && this._heroSkinId === char.skinId) {
      this._setupCanvasForFight();
    } else {
      this._heroSkinId = char.skinId;
      this._loadSprites(char.skinId);
    }
  }

  // ─── Socket Listeners ──────────────────────────────────

  _setupDojoSocketListeners(): void {
    if (!this._socket) return;

    this._socket.on("combat:dojo-started", (data: { sessionId: string; dojoEndsAt: number }) => {
      this._sessionId = data.sessionId;
      this._dojoEndsAt = data.dojoEndsAt;

      // If sprites are loaded, start countdown; otherwise _setupCanvasForFight will call it
      if (this._spritesLoaded && this._phase === "loading") {
        this._setupCanvasForFight();
      }
    });

    this._socket.on("combat:tap-result", (data: {
      damage: number;
      isCrit: boolean;
      damageBreakdown?: Record<string, number>;
      totalDamage: number;
      totalTaps: number;
      dojoEnded: boolean;
      timeLeftMs: number;
    }) => {
      if (this._phase !== "fight") return;

      // Update from server (authoritative)
      this._totalDamage = data.totalDamage;
      this._tapCount = data.totalTaps;

      // Hero attack animation
      if (this._hero) this._hero.attack();

      // Enemy hurt animation
      if (this._enemy) {
        if (this._enemy.engine.hasAnimation("hurt")) {
          this._enemy.play("hurt", {
            onComplete: () => this._enemy?.play("idle"),
          });
        }
        this._enemy.hit();
      }

      // Haptic feedback
      haptic("light");

      // Update HUD
      this._updateHud();

      // Float damage number
      this._spawnDmgFloat(data.damage, data.isCrit);

      // Server says time's up
      if (data.dojoEnded) {
        this._emitCompleteDojo();
      }
    });

    this._socket.on("combat:dojo-completed", (data: {
      totalDamage: number;
      totalTaps: number;
      dps: number;
      bestDamage: number;
      isNewBest: boolean;
    }) => {
      // Guard against double-fire (server auto-complete + client complete-dojo)
      if (this._phase === "results") return;
      this._stopServerTimer();
      this._endFight(data);
    });

    this._socket.on("combat:skill-result", (data: {
      skillId: string;
      cooldownMs: number;
      damage?: number;
      isCrit?: boolean;
      totalDamage?: number;
      totalTaps?: number;
    }) => {
      if (this._phase !== "fight") return;
      // Update totals if server returned them
      if (data.totalDamage !== undefined) this._totalDamage = data.totalDamage;
      if (data.totalTaps !== undefined) this._tapCount = data.totalTaps;
      this._updateHud();
      // Emit skillHit so the ability slot shows the cooldown overlay
      this.events.emit("skillHit", {
        skillId: data.skillId,
        cooldownMs: data.cooldownMs,
        damage: data.damage ?? 0,
        isCrit: data.isCrit ?? false,
      });
      // Play hero attack animation
      if (this._hero) this._hero.attack();
      if (this._enemy) {
        if (this._enemy.engine.hasAnimation("hurt")) {
          this._enemy.play("hurt", { onComplete: () => this._enemy?.play("idle") });
        }
        if (data.damage && data.damage > 0) this._enemy.hit();
      }
    });

    this._socket.on("combat:error", (data: { message: string }) => {
      console.error("[DojoScene] Server error:", data.message);
      if (this._phase === "loading") {
        this._showOverlay("Error: " + data.message);
      }
    });

    this._socket.on("combat:banned", (data: { expiresAt: number; reason: string }) => {
      this._stopTimers();
      this._sessionId = null;
      if (this._overlayEl) {
        this._overlayEl.classList.remove("dojo-overlay--hidden");
        const hours = Math.ceil((data.expiresAt - Date.now()) / 3_600_000);
        this._overlayEl.innerHTML = `
          <div class="dojo-results">
            <div class="dojo-results__title" style="color:#e74c3c">Banned</div>
            <div class="dojo-results__row">
              <span>Suspicious activity detected</span>
            </div>
            <div class="dojo-results__row">
              <span>Expires in ~${hours}h</span>
            </div>
            <div class="dojo-results__buttons">
              <button class="dojo-results__btn dojo-results__btn--back" id="dojo-ban-back">Return to Hideout</button>
            </div>
          </div>
        `;
        this._overlayEl.querySelector("#dojo-ban-back")?.addEventListener("click", () => {
          this.sceneManager.switchTo("hideout");
        });
      }
    });
  }

  _cleanupDojoSocket(): void {
    if (!this._socket) return;
    this._socket.off("combat:dojo-started");
    this._socket.off("combat:tap-result");
    this._socket.off("combat:skill-result");
    this._socket.off("combat:dojo-completed");
    this._socket.off("combat:error");
    this._socket.off("combat:banned");
    this._socket = null;
    this._sessionId = null;
    this._dojoEndsAt = null;
  }

  // ─── Sprite Loading ────────────────────────────────────

  async _loadSprites(heroSkinId: string): Promise<void> {
    try {
      const heroSkin = getHeroSkin(heroSkinId) as SkinConfig | undefined;
      const dummySkin = getEnemySkin(DUMMY_SKIN_ID) as SkinConfig | undefined;

      if (!heroSkin) throw new Error(`Hero skin not found: ${heroSkinId}`);
      if (!dummySkin) throw new Error(`Dummy skin not found: ${DUMMY_SKIN_ID}`);

      this._hero = new HeroCharacter(heroSkin);
      this._enemy = new EnemyCharacter(dummySkin, {
        xRatio: 0.75,
        groundLine: 0.90,
        scale: (dummySkin.scale ?? 1),
        flipX: false,
      });
      this._bg = new BackgroundRenderer();

      await Promise.all([
        this._hero.load(),
        this._enemy.load(),
        this._bg.load(DOJO_BG),
      ]);

      this._hero.play("idle");
      this._enemy.play("idle");
      this._spritesLoaded = true;

      this._setupCanvasForFight();
    } catch (err) {
      console.error("[DojoScene] Failed to load sprites:", err);
      this._showOverlay("Failed to load. Tap to retry.");
    }
  }

  _setupCanvasForFight(): void {
    // Wait for both sprites AND server session
    if (!this._spritesLoaded || !this._sessionId) return;

    // Reset sprite states
    if (this._enemy) {
      this._enemy.resetState();
      this._enemy.play("idle");
    }
    if (this._hero) {
      this._hero.play("idle");
    }

    // Setup canvas
    this._resizeCanvas();
    this._ctx = this._canvas!.getContext("2d");
    this._canvas!.classList.remove("hidden");

    // Resize observer
    const arenaEl = this.container.querySelector("#dojo-arena") as HTMLElement;
    if (arenaEl) {
      this._resizeObserver = new ResizeObserver(() => {
        this._resizeCanvas();
        this._ctx = this._canvas!.getContext("2d");
        this._drawFrame();
      });
      this._resizeObserver.observe(arenaEl);
    }

    // Start render loop
    this._startTick();
    this._drawFrame();
    this._startCountdown();
  }

  // ─── Canvas ──────────────────────────────────────────────

  _resizeCanvas(): void {
    if (!this._canvas) return;
    const arena = this._canvas.parentElement;
    if (!arena) return;
    const rect = arena.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._canvas.style.width = rect.width + "px";
    this._canvas.style.height = rect.height + "px";
    this._canvasW = rect.width * dpr;
    this._canvasH = rect.height * dpr;
    this._dpr = dpr;
  }

  // ─── Render Loop ─────────────────────────────────────────

  _startTick(): void {
    const TICK_MS = 80;
    let last = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      if (this._hero) this._hero.update(dt);
      if (this._enemy) this._enemy.update(dt);

      const heroDirty = this._hero?.needsRedraw ?? false;
      const enemyDirty = this._enemy?.needsRedraw ?? false;

      if (heroDirty || enemyDirty) {
        if (this._hero) this._hero.clearRedraw();
        if (this._enemy) this._enemy.clearRedraw();
        this._drawFrame();
      }

      this._tickTimer = setTimeout(tick, TICK_MS);
    };

    this._tickTimer = setTimeout(tick, TICK_MS);
  }

  _drawFrame(): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const w = this._canvasW;
    const h = this._canvasH;
    const dpr = this._dpr;

    ctx.clearRect(0, 0, w, h);
    if (this._bg) this._bg.draw(ctx, w, h);
    if (this._hero) this._hero.draw(ctx, w, h, dpr);
    if (this._enemy) this._enemy.draw(ctx, w, h, dpr);
  }

  // ─── Countdown Phase ────────────────────────────────────

  _startCountdown(): void {
    this._phase = "countdown";
    this._countdownValue = COUNTDOWN_SECONDS;
    this._showOverlay(String(this._countdownValue));

    this._countdownTimer = setInterval(() => {
      this._countdownValue--;
      if (this._countdownValue <= 0) {
        clearInterval(this._countdownTimer!);
        this._countdownTimer = null;
        this._hideOverlay();
        this._startFight();
      } else {
        this._showOverlay(String(this._countdownValue));
      }
    }, 1000);
  }

  // ─── Fight Phase ─────────────────────────────────────────

  _startFight(): void {
    this._phase = "fight";
    this._totalDamage = 0;
    this._tapCount = 0;
    this._lastTapTime = 0;
    this._updateHud();

    // Timer derived from server's dojoEndsAt (100ms interval for smooth countdown)
    this._serverTimerInterval = setInterval(() => {
      if (!this._dojoEndsAt) return;
      const timeLeftMs = this._dojoEndsAt - Date.now();
      const secsLeft = Math.max(0, Math.ceil(timeLeftMs / 1000));

      if (this._timerEl) this._timerEl.textContent = `${secsLeft}s`;

      if (timeLeftMs <= 0) {
        this._stopServerTimer();
        this._emitCompleteDojo();
      }
    }, 100);
  }

  _emitCompleteDojo(): void {
    if (!this._socket || !this._sessionId) return;
    this._socket.emit("combat:complete-dojo", { sessionId: this._sessionId });
  }

  _stopServerTimer(): void {
    if (this._serverTimerInterval) {
      clearInterval(this._serverTimerInterval);
      this._serverTimerInterval = null;
    }
  }

  _onTap(): void {
    if (this._phase !== "fight") return;
    if (!this._socket || !this._sessionId) return;

    // Client-side rate limit: max 10 taps/sec (100ms between taps) for UX smoothing
    const now = performance.now();
    if (now - this._lastTapTime < 100) return;
    this._lastTapTime = now;

    // Emit tap to server (server calculates damage)
    this._socket.emit("combat:tap", { sessionId: this._sessionId });
  }

  _updateHud(): void {
    if (this._dmgEl) this._dmgEl.textContent = this._formatDmg(this._totalDamage);
  }

  _spawnDmgFloat(dmg: number, isCrit: boolean): void {
    const arena = this.container.querySelector("#dojo-arena") as HTMLElement | null;
    if (!arena) return;

    const el = document.createElement("div");
    el.className = "dojo-dmg-float" + (isCrit ? " dojo-dmg-float--crit" : "");
    el.textContent = isCrit ? `${dmg}!` : String(dmg);

    // Random position in right half of arena (where dummy is)
    const rect = arena.getBoundingClientRect();
    const x = rect.width * 0.55 + Math.random() * rect.width * 0.3;
    const y = rect.height * 0.3 + Math.random() * rect.height * 0.3;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    arena.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  // ─── End Fight ──────────────────────────────────────────

  _endFight(result: {
    totalDamage: number;
    totalTaps: number;
    dps: number;
    bestDamage: number;
    isNewBest: boolean;
  }): void {
    this._phase = "results";
    this._stopServerTimer();

    // Update local best cache
    this._totalDamage = result.totalDamage;
    this._tapCount = result.totalTaps;
    this._bestDamage = result.bestDamage;
    saveBestDamage(this._charId, result.bestDamage);

    if (this._bestEl) {
      this._bestEl.textContent = `Best: ${this._formatDmg(result.bestDamage)}`;
    }

    this._showResults(result.totalDamage, result.dps, result.totalTaps, result.isNewBest);
  }

  _showResults(total: number, dps: number, taps: number, isNewBest: boolean): void {
    if (!this._overlayEl) return;

    this._overlayEl.classList.remove("dojo-overlay--hidden");
    this._overlayEl.innerHTML = `
      <div class="dojo-results">
        ${isNewBest ? '<div class="dojo-results__badge">New Record!</div>' : ""}
        <div class="dojo-results__title">Results</div>
        <div class="dojo-results__row">
          <span>Total Damage</span>
          <span class="dojo-results__value">${this._formatDmg(total)}</span>
        </div>
        <div class="dojo-results__row">
          <span>DPS</span>
          <span class="dojo-results__value">${this._formatDmg(dps)}</span>
        </div>
        <div class="dojo-results__row">
          <span>Taps</span>
          <span class="dojo-results__value">${taps}</span>
        </div>
        <div class="dojo-results__row">
          <span>Best</span>
          <span class="dojo-results__value">${this._formatDmg(this._bestDamage)}</span>
        </div>
        <div class="dojo-results__buttons">
          <button class="dojo-results__btn dojo-results__btn--retry" id="dojo-retry">Again</button>
          <button class="dojo-results__btn dojo-results__btn--top" id="dojo-results-top">Leaderboard</button>
          <button class="dojo-results__btn dojo-results__btn--back" id="dojo-back-result">Hideout</button>
        </div>
      </div>
    `;

    this._overlayEl.querySelector("#dojo-retry")!.addEventListener("click", () => {
      this._hideOverlay();
      this._resetRound();
    });

    this._overlayEl.querySelector("#dojo-results-top")!.addEventListener("click", () => {
      this._stopTimers();
      this._destroySprites();
      this._cleanupActionBar();
      this._cleanupDojoSocket();
      this._showLeaderboard();
    });

    this._overlayEl.querySelector("#dojo-back-result")!.addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });
  }

  _resetRound(): void {
    this._totalDamage = 0;
    this._tapCount = 0;
    this._lastTapTime = 0;
    this._sessionId = null;
    this._dojoEndsAt = null;
    this._updateHud();

    // Reset enemy sprite state
    if (this._enemy) {
      this._enemy.resetState();
      this._enemy.play("idle");
    }
    if (this._hero) {
      this._hero.play("idle");
    }

    // Request new dojo session from server
    if (this._socket) {
      this._showOverlay("Starting...");

      // Replace the dojo-started listener with a one-shot that starts countdown
      this._socket.off("combat:dojo-started");
      this._socket.once("combat:dojo-started", (data: { sessionId: string; dojoEndsAt: number }) => {
        this._sessionId = data.sessionId;
        this._dojoEndsAt = data.dojoEndsAt;
        this._startCountdown();
      });

      this._socket.emit("combat:start-dojo", {});
    }
  }

  // ─── Leaderboard ─────────────────────────────────────────

  async _showLeaderboard(): Promise<void> {
    this._phase = "leaderboard";

    this.container.innerHTML = `
      <div class="dojo-landing" style="background-image: url('${DOJO_BG}')">
        <div class="dojo-landing__header">
          <button class="dojo-back-btn" id="dojo-lb-back">&larr;</button>
          <span class="dojo-landing__title">Leaderboard</span>
          <span class="dojo-landing__best"></span>
        </div>
        <div class="dojo-lb-tabs">
          <button class="dojo-lb-tab dojo-lb-tab--active" id="dojo-tab-friends">Friends</button>
          <button class="dojo-lb-tab" id="dojo-tab-global">Global</button>
        </div>
        <div class="dojo-leaderboard" id="dojo-leaderboard">
          <div class="friends-loading">Loading...</div>
        </div>
      </div>
    `;

    this.container.querySelector("#dojo-lb-back")!.addEventListener("click", () => {
      this._showLanding();
    });

    const tabFriends = this.container.querySelector("#dojo-tab-friends") as HTMLElement;
    const tabGlobal = this.container.querySelector("#dojo-tab-global") as HTMLElement;

    tabFriends.addEventListener("click", () => {
      if (this._activeTab === "friends") return;
      this._activeTab = "friends";
      tabFriends.classList.add("dojo-lb-tab--active");
      tabGlobal.classList.remove("dojo-lb-tab--active");
      this._loadLeaderboardData();
    });

    tabGlobal.addEventListener("click", () => {
      if (this._activeTab === "global") return;
      this._activeTab = "global";
      tabGlobal.classList.add("dojo-lb-tab--active");
      tabFriends.classList.remove("dojo-lb-tab--active");
      this._loadLeaderboardData();
    });

    // Default to friends tab
    this._activeTab = "friends";
    this._loadLeaderboardData();
  }

  async _loadLeaderboardData(): Promise<void> {
    const lbEl = this.container.querySelector("#dojo-leaderboard") as HTMLElement;
    if (!lbEl) return;

    lbEl.innerHTML = `<div class="friends-loading">Loading...</div>`;

    try {
      let list: any[];

      if (this._activeTab === "friends") {
        const data = await friends.dojoLeaderboard(this._charId);
        list = data.leaderboard || [];
      } else {
        const data = await friends.dojoGlobal(this._charId);
        list = data.leaderboard || [];
      }

      if (list.length === 0) {
        lbEl.innerHTML = `<div class="friends-empty">No data yet. Complete a challenge first!</div>`;
        return;
      }

      lbEl.innerHTML = list.map((entry: any) => {
        const cls = getCharacterClass(entry.classId);
        const selfClass = entry.isSelf ? " dojo-leaderboard__row--self" : "";
        const tgTag = entry.telegramUsername ? `<span class="dojo-leaderboard__tg">@${entry.telegramUsername}</span>` : "";
        return `
          <div class="dojo-leaderboard__row${selfClass}">
            <span class="dojo-leaderboard__rank">#${entry.rank}</span>
            <span class="dojo-leaderboard__icon">${cls?.icon || "?"}</span>
            <div class="dojo-leaderboard__info">
              <span class="dojo-leaderboard__name">${entry.nickname}${entry.isSelf ? " (you)" : ""}</span>
              <span class="dojo-leaderboard__meta">${cls?.name || entry.classId} &middot; Lv.${entry.level}${tgTag ? " &middot; " + tgTag : ""}</span>
            </div>
            <span class="dojo-leaderboard__dmg">${entry.bestDamage > 0 ? this._formatDmg(entry.bestDamage) : "---"}</span>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("[DojoScene] Leaderboard failed:", err);
      lbEl.innerHTML = `<div class="friends-empty">Failed to load leaderboard</div>`;
    }
  }

  _cleanupActionBar(): void {
    this._cleanupKeyboard?.();
    this._cleanupKeyboard = null;
    this._cleanupPotions?.();
    this._cleanupPotions = null;
    this._cleanupAbilities?.();
    this._cleanupAbilities = null;
  }

  // ─── Overlay Helpers ────────────────────────────────────

  _showOverlay(text: string): void {
    if (!this._overlayEl) return;
    this._overlayEl.classList.remove("dojo-overlay--hidden");
    this._overlayEl.innerHTML = `<div class="dojo-overlay__text">${text}</div>`;
  }

  _hideOverlay(): void {
    if (!this._overlayEl) return;
    this._overlayEl.classList.add("dojo-overlay--hidden");
  }

  // ─── Utils ──────────────────────────────────────────────

  _formatDmg(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  _stopTimers(): void {
    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    this._stopServerTimer();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  _destroySprites(): void {
    if (this._hero) {
      this._hero.destroy();
      this._hero = null;
    }
    if (this._enemy) {
      this._enemy.destroy();
      this._enemy = null;
    }
    if (this._bg) {
      this._bg.destroy();
      this._bg = null;
    }
    this._spritesLoaded = false;
    this._canvas = null;
    this._ctx = null;
  }

  // ─── Cleanup ────────────────────────────────────────────

  unmount(): void {
    this._stopTimers();
    this._destroySprites();
    this._cleanupActionBar();
    this._cleanupDojoSocket();

    this._overlayEl = null;
    this._bestEl = null;
    this._timerEl = null;
    this._dmgEl = null;
    this._tapHandler = null;

    this.container.innerHTML = "";
  }
}
