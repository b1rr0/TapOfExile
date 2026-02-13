import { getHeroSkin } from "../data/sprite-registry.js";
import { HeroCharacter } from "../ui/characters/hero-character.js";
import { formatCombatTime, renderLogEntries, createLogPanelHTML } from "../ui/combat-log-renderer.js";
import type { LogEntry } from "../ui/combat-log-renderer.js";
import type { SharedDeps } from "../types.js";

/**
 * DeathScene — shown after the player dies in combat.
 *
 * Displays:
 *  - Dead hero sprite (last frame of death animation)
 *  - Combat duration & killer monster name
 *  - "Combat Log" button (opens fullscreen log)
 *  - "Hideout" button
 */
export class DeathScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  private _hero: HeroCharacter | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _resizeObs: ResizeObserver | null = null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;
  }

  /**
   * @param params.heroSkinId   — skin id for dead-hero sprite
   * @param params.killerName   — name of the monster that killed the player
   * @param params.combatTime   — combat duration in ms
   * @param params.logEntries   — LogEntry[] from CombatLog
   * @param params.combatStartTime — absolute ms timestamp
   */
  mount(params: Record<string, any> = {}): void {
    const {
      heroSkinId = "samurai_1",
      killerName = "Unknown",
      combatTime = 0,
      logEntries = [] as LogEntry[],
      combatStartTime = Date.now(),
    } = params;

    const timeStr = formatCombatTime(combatTime);

    this.container.innerHTML = `
      <div class="death-scene">
        <div class="death-scene__hero-area">
          <canvas class="death-scene__canvas" id="death-canvas"></canvas>
        </div>

        <div class="death-scene__content">
          <div class="death-scene__title">Defeated</div>
          <div class="death-scene__info">
            <span class="death-scene__time">${timeStr}</span>
            <span class="death-scene__killer">Slain by <strong>${killerName}</strong></span>
          </div>

          <div class="death-scene__actions">
            <button class="death-scene__btn death-scene__btn--log" id="death-log-btn">\uD83D\uDCDC Combat Log</button>
            <button class="death-scene__btn death-scene__btn--hideout" id="death-hideout-btn">Hideout</button>
          </div>
        </div>

        ${createLogPanelHTML("death-log-panel", "death-log-list", "death-log-close")}
      </div>
    `;

    // ── Buttons ──
    (this.container.querySelector("#death-hideout-btn") as HTMLElement)
      .addEventListener("click", () => this.sceneManager.switchTo("hideout"));

    const logPanel = this.container.querySelector("#death-log-panel") as HTMLElement;
    const logList  = this.container.querySelector("#death-log-list") as HTMLElement;

    // Prevent clicks on the panel from triggering anything underneath
    logPanel.addEventListener("click", (e) => e.stopPropagation());

    (this.container.querySelector("#death-log-btn") as HTMLElement)
      .addEventListener("click", () => {
        logPanel.classList.toggle("combat-log-panel--hidden");
        if (!logPanel.classList.contains("combat-log-panel--hidden") && logList.children.length === 0) {
          renderLogEntries(logList, logEntries as LogEntry[], combatStartTime as number);
        }
      });

    (this.container.querySelector("#death-log-close") as HTMLElement)
      .addEventListener("click", () => logPanel.classList.add("combat-log-panel--hidden"));

    // ── Dead hero sprite ──
    this._loadHeroSprite(heroSkinId);
  }

  private async _loadHeroSprite(skinId: string): Promise<void> {
    try {
      const skin = getHeroSkin(skinId);
      if (!skin) return;

      this._hero = new HeroCharacter(skin, {
        xRatio: 0.5,
        groundLine: 0.92,
        scale: (skin.scale ?? 1) * 1.4,
      });
      await this._hero.load();

      this._canvas = this.container.querySelector("#death-canvas") as HTMLCanvasElement;
      if (!this._canvas) return;

      this._resizeCanvas();
      this._ctx = this._canvas.getContext("2d");

      // Play death animation then freeze on last frame
      let animDone = false;

      if (this._hero.engine.hasAnimation("death")) {
        this._hero.play("death", {
          onComplete: () => { animDone = true; },
        });

        // Tick loop drives animation until onComplete fires
        let lastT = performance.now();
        const tick = () => {
          if (!this._hero) return;
          const now = performance.now();
          const dt = Math.min((now - lastT) / 1000, 0.2);
          lastT = now;
          this._hero.update(dt);
          this._drawFrame();
          if (!animDone) {
            requestAnimationFrame(tick);
          } else {
            // Final frozen frame
            this._drawFrame();
          }
        };
        requestAnimationFrame(tick);
      } else {
        this._hero.play("idle");
        this._hero.update(0);
        // Apply a "dead" tint via low alpha
        this._drawFrame(0.5);
      }

      // Handle resize
      this._resizeObs = new ResizeObserver(() => {
        this._resizeCanvas();
        this._ctx = this._canvas!.getContext("2d");
        this._drawFrame();
      });
      this._resizeObs.observe(this._canvas.parentElement!);
    } catch (err) {
      console.warn("[DeathScene] Failed to load hero sprite", err);
    }
  }

  private _resizeCanvas(): void {
    if (!this._canvas) return;
    const rect = this._canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._canvas.style.width = rect.width + "px";
    this._canvas.style.height = rect.height + "px";
  }

  private _drawFrame(alpha: number = 0.6): void {
    if (!this._ctx || !this._canvas || !this._hero) return;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const dpr = window.devicePixelRatio || 1;
    this._ctx.clearRect(0, 0, w, h);
    this._ctx.save();
    this._ctx.globalAlpha = alpha;
    this._hero.draw(this._ctx, w, h, dpr);
    this._ctx.restore();
  }

  unmount(): void {
    if (this._resizeObs) this._resizeObs.disconnect();
    if (this._hero) this._hero.destroy();
    this._hero = null;
    this._canvas = null;
    this._ctx = null;
    this.container.innerHTML = "";
  }
}
