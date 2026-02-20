import { CombatManager } from "../game/combat.js";
import { BattleScene } from "../ui/battle-scene.js";
import { Effects } from "../ui/effects.js";
import { CombatLog } from "../ui/combat-log.js";
import { HUD } from "../ui/hud.js";
import { Equipment } from "../ui/equipment.js";
import { renderActionBarHTML, initPotionSlots, initKeyboardHandler } from "../ui/action-bar.js";
import { haptic } from "../utils/haptic.js";
import { isActComplete, getBackgroundForLocation, getActModifiers, getLocationById, ACT_BACKGROUNDS } from "../data/locations.js";
import type { SharedDeps, Location } from "../types.js";

// ─── Loading screen flavor text (Hearthstone-style, rotates every 5s) ──
const LOADING_TIPS: string[] = [
  "Sharpening katanas...",
  "Polishing shields...",
  "Forging armor plates...",
  "Gathering iron for arrows...",
  "Dropped a gold coin...",
  "Tripped over a rock...",
  "Feeding the war horses...",
  "Brewing healing potions...",
  "Counting monster teeth...",
  "Oiling the crossbow...",
  "Lost a sock in the dungeon...",
  "Arguing with the blacksmith...",
  "Tightening bowstrings...",
  "Checking for traps...",
  "Waking up the mage...",
  "Sorting gems by color...",
  "Bribing the gate guard...",
  "Sweeping the throne room...",
  "Calibrating the catapult...",
  "Chasing a runaway chicken...",
  "Rolling for initiative...",
  "Untangling the fishing net...",
  "Teaching goblins manners...",
  "Restringing the lute...",
  "Negotiating with the dragon...",
];

const LOADING_TIP_INTERVAL = 5000;
const LOADING_MAX_DURATION = 30000;

/**
 * CombatScene — wraps the current battle flow into a single scene.
 *
 * Lifecycle: mount(params) / unmount() with full cleanup.
 */
export class CombatScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  // Sub-systems (created in mount)
  combat: CombatManager | null;
  battleScene: BattleScene | null;
  effects: Effects | null;
  combatLog: CombatLog | null;
  hud: HUD | null;
  equipment: Equipment | null;

  // Refs
  _tapHandler: (() => void) | null;
  _onLocationComplete: ((data: any) => void) | null;
  _onMapComplete: ((data: any) => void) | null;
  _onPlayerDied: (() => void) | null;
  _onCombatReady: (() => void) | null;
  _cleanupPotions: (() => void) | null;
  _cleanupKeyboard: (() => void) | null;
  _onPlayerBanned: ((data: any) => void) | null;

  // Loading overlay
  _loadingEl: HTMLElement | null;
  _loadingTipEl: HTMLElement | null;
  _loadingTimerEl: HTMLElement | null;
  _loadingTipInterval: ReturnType<typeof setInterval> | null;
  _loadingTimerInterval: ReturnType<typeof setInterval> | null;
  _loadingTimeout: ReturnType<typeof setTimeout> | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this.combat = null;
    this.battleScene = null;
    this.effects = null;
    this.combatLog = null;
    this.hud = null;
    this.equipment = null;

    this._tapHandler = null;
    this._onLocationComplete = null;
    this._onMapComplete = null;
    this._onPlayerDied = null;
    this._onCombatReady = null;
    this._cleanupPotions = null;
    this._cleanupKeyboard = null;
    this._onPlayerBanned = null;

    this._loadingEl = null;
    this._loadingTipEl = null;
    this._loadingTimerEl = null;
    this._loadingTipInterval = null;
    this._loadingTimerInterval = null;
    this._loadingTimeout = null;
  }

  mount(params: Record<string, any> = {}): void {
    const isMapMode = !!params.mapConfig;

    let stageLabel: string;
    let mapLocation: Location | null = null;
    if (isMapMode) {
      const mc = params.mapConfig;
      if (mc.isBoss) {
        stageLabel = mc.bossDef.name;
      } else {
        mapLocation = mc.locationId ? getLocationById(mc.locationId) ?? null : null;
        stageLabel = mapLocation
          ? `${mapLocation.name} · ${mc.tierDef.name}`
          : `Map · ${mc.tierDef.name}`;
      }
    } else {
      const locationName = params.location ? params.location.name : "Battle";
      const monsterLvl = params.location ? params.location.order : null;
      const isSideQuest = params.location && params.location.order > 8;
      if (isSideQuest) {
        stageLabel = monsterLvl
          ? `<span class="hud-side-tag">Side</span> ${locationName} · Lv.${monsterLvl}`
          : `<span class="hud-side-tag">Side</span> ${locationName}`;
      } else {
        stageLabel = monsterLvl
          ? `${locationName} · Lv.${monsterLvl}`
          : locationName;
      }
    }

    const actNumber: number = isMapMode
      ? (params.mapConfig.locationAct || 5)
      : (params.location ? params.location.act : 1);
    const mods = getActModifiers(actNumber);
    let modsHtml = "";
    if (mods.length) {
      const chips = mods.map((m: any) =>
        `<div class="combat-mod combat-mod--${m.type}"><span class="combat-mod__icon">${m.icon}</span><span class="combat-mod__name">${m.name}</span><span class="combat-mod__desc">${m.description}</span></div>`
      ).join("");
      modsHtml = `
        <button class="combat-mods-toggle" id="combat-mods-toggle">${mods.map((m: any) => m.icon).join("")}</button>
        <div class="combat-mods-panel combat-mods-panel--hidden" id="combat-mods-panel">
          <div class="combat-mods-panel__title">Zone Effects</div>
          ${chips}
        </div>
      `;
    }

    const activeChar = this.state.getActiveCharacter();
    const playerData = this.state.data.player;

    this.container.innerHTML = `
      <div id="game-screen" class="screen combat-screen">
        <div id="hud" class="hud">
          <div class="hud-center">
            <span id="stage-display" class="stage-display">${stageLabel}</span>
          </div>
        </div>

        <div id="battle-scene" class="battle-scene"></div>

        ${renderActionBarHTML({
          level: playerData ? playerData.level : 1,
          xp: playerData ? playerData.xp : 0,
          xpToNext: playerData ? playerData.xpToNext : 100,
          maxHp: activeChar?.maxHp || activeChar?.hp || 100,
          hp: activeChar?.hp || 100,
          dodgeChance: activeChar?.dodgeChance || 0,
          resistance: activeChar?.resistance,
        })}

        <div class="flee-confirm-overlay flee-confirm-overlay--hidden" id="flee-confirm">
          <div class="flee-confirm-box">
            <p class="flee-confirm-title">Flee the battlefield?</p>
            <p class="flee-confirm-text">Entry fee will not be refunded and rewards will be lost.</p>
            <div class="flee-confirm-actions">
              <button class="flee-confirm-btn flee-confirm-btn--cancel" id="flee-cancel">Stay</button>
              <button class="flee-confirm-btn flee-confirm-btn--leave" id="flee-leave">Leave</button>
            </div>
          </div>
        </div>

        <div class="ban-overlay ban-overlay--hidden" id="ban-overlay">
          <div class="ban-overlay-box">
            <p class="ban-overlay-title">Temporarily Suspended</p>
            <p class="ban-overlay-text">Abnormal tap rate detected.<br>Banned until <span id="ban-until-time"></span></p>
            <button class="ban-overlay-btn" id="ban-leave-btn">Return to Hideout</button>
          </div>
        </div>

        <div class="combat-loading-overlay" id="combat-loading-overlay">
          <button class="combat-loading-overlay__close" id="combat-loading-close">&times;</button>
          <div class="battle-loading__spinner"></div>
          <div class="combat-loading-overlay__timer" id="combat-loading-timer">0s</div>
          <div class="combat-loading-overlay__tip" id="combat-loading-tip"></div>
        </div>

        ${modsHtml}
      </div>
    `;

    const gameScreen = this.container.querySelector("#game-screen") as HTMLElement;
    const hudEl = this.container.querySelector("#hud") as HTMLElement;
    const battleEl = this.container.querySelector("#battle-scene") as HTMLElement;

    // Start loading overlay (shown until server responds)
    this._loadingEl = this.container.querySelector("#combat-loading-overlay");
    this._loadingTipEl = this.container.querySelector("#combat-loading-tip");
    this._loadingTimerEl = this.container.querySelector("#combat-loading-timer");
    this._startLoadingOverlay();

    // Close button → return to hideout
    const loadingClose = this.container.querySelector("#combat-loading-close") as HTMLElement | null;
    if (loadingClose) {
      loadingClose.addEventListener("click", () => {
        this._stopLoadingOverlay();
        if (this.combat) {
          this.combat.flee().catch(() => {});
        }
        if (this.sceneManager) {
          this.sceneManager.switchTo("hideout");
        }
      });
    }

    this.combat = new CombatManager(this.state, this.events);
    this.hud = new HUD(hudEl, this.events);

    const heroSkin: string = activeChar ? activeChar.skinId : "samurai_1";

    let backgroundSrc: string | null = null;
    if (isMapMode) {
      if (mapLocation) {
        backgroundSrc = getBackgroundForLocation(mapLocation);
      } else {
        const caveImages: string[] = ACT_BACKGROUNDS[5] || [];
        backgroundSrc = caveImages.length > 0
          ? caveImages[Math.floor(Math.random() * caveImages.length)]
          : null;
      }
    } else if (params.location) {
      backgroundSrc = getBackgroundForLocation(params.location);
    }

    this.battleScene = new BattleScene(battleEl, this.events, { heroSkin, backgroundSrc });

    // Hide loading overlay only when BOTH server responded AND sprites loaded
    const combatReadyPromise = new Promise<void>((resolve) => {
      this._onCombatReady = () => resolve();
      this.events.on("combatReady", this._onCombatReady);
    });
    Promise.all([
      combatReadyPromise,
      this.battleScene.spritesReady,
    ]).then(() => {
      this._stopLoadingOverlay();
    });
    this.effects = new Effects(battleEl, this.events);
    this.combatLog = new CombatLog(battleEl, this.events);
    this.equipment = new Equipment(gameScreen, this.events, this.state);

    const exitBtn = document.createElement("button");
    exitBtn.className = "battle-exit-btn";
    exitBtn.id = "flee-btn";
    exitBtn.textContent = "\uD83D\uDEAA";
    battleEl.appendChild(exitBtn);

    // Tap on battle scene to attack
    this._tapHandler = () => {
      this.combat!.handleTap();
      haptic("light");
    };
    battleEl.addEventListener("click", this._tapHandler);

    // ── Keyboard shortcuts (desktop, layout-independent) ──
    this._cleanupKeyboard = initKeyboardHandler(this.container, {
      onTap: () => {
        if (this.combat) {
          this.combat.handleTap();
          haptic("light");
        }
      },
      onAbility: (idx) => {
        const btn = this.container.querySelector(`#ability-${idx}`) as HTMLButtonElement | null;
        if (btn && !btn.classList.contains("action-slot--empty")) btn.click();
      },
      onPotion: (slot) => {
        const btn = this.container.querySelector(`#potion-${slot}`) as HTMLButtonElement | null;
        if (btn && !btn.classList.contains("action-slot--empty")) btn.click();
      },
    });

    const modsToggle = this.container.querySelector("#combat-mods-toggle") as HTMLElement | null;
    const modsPanel = this.container.querySelector("#combat-mods-panel") as HTMLElement | null;
    if (modsToggle && modsPanel) {
      modsToggle.addEventListener("click", () => {
        modsPanel.classList.toggle("combat-mods-panel--hidden");
      });
    }

    const fleeOverlay = this.container.querySelector("#flee-confirm") as HTMLElement;
    (this.container.querySelector("#flee-btn") as HTMLButtonElement).addEventListener("click", () => {
      fleeOverlay.classList.remove("flee-confirm-overlay--hidden");
    });
    (this.container.querySelector("#flee-cancel") as HTMLButtonElement).addEventListener("click", () => {
      fleeOverlay.classList.add("flee-confirm-overlay--hidden");
    });
    (this.container.querySelector("#flee-leave") as HTMLButtonElement).addEventListener("click", () => {
      fleeOverlay.classList.add("flee-confirm-overlay--hidden");
      // Flee via API
      if (this.combat) {
        this.combat.flee().catch((err) => console.warn("[CombatScene] Flee failed:", err));
      }
      if (this.sceneManager) {
        this.sceneManager.switchTo("hideout");
      }
    });

    // ── Ban overlay ─────────────────────────────────────────
    const banOverlay = this.container.querySelector("#ban-overlay") as HTMLElement;
    const banLeaveBtn = this.container.querySelector("#ban-leave-btn") as HTMLButtonElement;
    const banUntilTime = this.container.querySelector("#ban-until-time") as HTMLElement;

    this._onPlayerBanned = (data: { expiresAt: number }) => {
      banUntilTime.textContent = new Date(data.expiresAt).toLocaleString();
      banOverlay.classList.remove("ban-overlay--hidden");
    };
    this.events.on("playerBanned", this._onPlayerBanned);

    banLeaveBtn.addEventListener("click", () => {
      if (this.sceneManager) {
        this.sceneManager.switchTo("hideout");
      }
    });

    // ── Wire potion buttons ──────────────────────────────────
    this._cleanupPotions = initPotionSlots({
      container: this.container,
      equipment: activeChar?.inventory?.equipment || {},
      onUsePotion: (slot) => { if (this.combat) this.combat.usePotion(slot); },
      events: this.events,
    });

    // Listen for player death — switch to death screen after brief delay.
    // We capture combat log data IMMEDIATELY to avoid it being null if
    // unmount() runs before the delayed scene switch (e.g. race with locationComplete).
    // A second snapshot is taken 300ms later to include staggered enemyAttack events.
    let _deathCaptured = false;
    this._onPlayerDied = () => {
      if (_deathCaptured) return;          // guard against double-fire
      _deathCaptured = true;

      // Snapshot #1 — immediate (guaranteed non-null combatLog)
      const combatLog = this.combatLog;
      let killerName = combatLog ? combatLog.currentMonsterName : "Unknown";
      let logEntries = combatLog ? [...combatLog.entries] : [];
      let combatStartTime = combatLog ? combatLog.combatStartTime : Date.now();

      // Snapshot #2 — after 300ms, picks up staggered enemyAttack events
      setTimeout(() => {
        const cl = this.combatLog;
        if (cl) {
          killerName = cl.currentMonsterName;
          logEntries = [...cl.entries];
          combatStartTime = cl.combatStartTime;
        }
      }, 300);

      // Switch scene after 2s total
      setTimeout(() => {
        if (this.sceneManager) {
          const combatTime = Date.now() - combatStartTime;
          this.sceneManager.switchTo("death", {
            heroSkinId: heroSkin,
            killerName,
            combatTime,
            logEntries,
            combatStartTime,
          });
        }
      }, 2000);
    };
    this.events.on("playerDied", this._onPlayerDied);

    // Snapshot act completion state BEFORE combat starts,
    // so we can detect if this fight just completed the act.
    const locActNumber = params.location ? params.location.act : 1;
    const completedBefore: string[] = [...(this.state.data.locations?.completed || [])];
    const wasActComplete = isActComplete(locActNumber, completedBefore);

    // Listen for location complete — server already persisted everything
    this._onLocationComplete = (data: any) => {
      const completedAfter: string[] = this.state.data.locations?.completed || [];
      const isNowComplete = isActComplete(locActNumber, completedAfter);
      const actJustCompleted = !wasActComplete && isNowComplete;

      const locName = params.location ? params.location.name : "Unknown";

      // Snapshot combat log before scene teardown
      const logEntries = this.combatLog ? [...this.combatLog.entries] : [];
      const combatStartTime = this.combatLog ? this.combatLog.combatStartTime : Date.now();

      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: locName,
          rewards: data.rewards,
          actComplete: actJustCompleted ? locActNumber : null,
          mapDrops: data.mapDrops || [],
          logEntries,
          combatStartTime,
        });
      }
    };
    this.events.on("locationComplete", this._onLocationComplete);

    // Listen for map complete — server already persisted drops + endgame stats
    this._onMapComplete = (data: any) => {
      const mc = data.mapConfig;
      const tier: number = mc.tier || 10;
      const isBoss: boolean = mc.isBoss || false;
      const mapDrops = data.mapDrops || [];

      const mapName: string = isBoss
        ? mc.bossDef.name
        : `Tier ${tier} Map`;

      // Snapshot combat log before scene teardown
      const logEntries = this.combatLog ? [...this.combatLog.entries] : [];
      const combatStartTime = this.combatLog ? this.combatLog.combatStartTime : Date.now();

      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: mapName,
          rewards: { gold: data.totalGold, xp: data.totalXp },
          mapDrops,
          isMapVictory: true,
          logEntries,
          combatStartTime,
        });
      }
    };
    this.events.on("mapComplete", this._onMapComplete);

    this.events.emit("stateLoaded", this.state.data);

    // Start combat via server API (async)
    if (isMapMode) {
      const mc = params.mapConfig;
      const mapKeyItemId = params.mapKeyItemId;
      const direction = mc.direction || undefined;
      this.combat.startMap(mc, mapKeyItemId, direction).catch((err) => {
        console.error("[CombatScene] Failed to start map:", err);
        if (this.sceneManager) this.sceneManager.switchTo("hideout");
      });
    } else if (params.location) {
      this.combat.startLocation(params.location).catch((err) => {
        console.error("[CombatScene] Failed to start location:", err);
        if (this.sceneManager) this.sceneManager.switchTo("hideout");
      });
    }
  }

  // ─── Loading overlay ──────────────────────────────────────

  /** Pick a random tip different from the current one. */
  private _randomTip(current: string): string {
    if (LOADING_TIPS.length <= 1) return LOADING_TIPS[0] || "";
    let next: string;
    do {
      next = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    } while (next === current && LOADING_TIPS.length > 1);
    return next;
  }

  /** Show the loading overlay and start rotating tips. */
  _startLoadingOverlay(): void {
    if (!this._loadingEl || !this._loadingTipEl) return;

    this._loadingEl.classList.remove("hidden");

    // Show first tip immediately
    const first = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
    this._loadingTipEl.textContent = first;

    // Timer counter (ticks every second)
    let elapsed = 0;
    if (this._loadingTimerEl) this._loadingTimerEl.textContent = "0s";
    this._loadingTimerInterval = setInterval(() => {
      elapsed++;
      if (this._loadingTimerEl) this._loadingTimerEl.textContent = `${elapsed}s`;
    }, 1000);

    // Rotate every 5s with fade
    this._loadingTipInterval = setInterval(() => {
      if (!this._loadingTipEl) return;
      const next = this._randomTip(this._loadingTipEl.textContent || "");
      this._loadingTipEl.style.opacity = "0";
      setTimeout(() => {
        if (!this._loadingTipEl) return;
        this._loadingTipEl.textContent = next;
        this._loadingTipEl.style.opacity = "1";
      }, 300);
    }, LOADING_TIP_INTERVAL);

    // Safety: force-hide after 30s
    this._loadingTimeout = setTimeout(() => {
      this._stopLoadingOverlay();
    }, LOADING_MAX_DURATION);
  }

  /** Hide loading overlay and clear all timers. */
  _stopLoadingOverlay(): void {
    if (this._loadingTipInterval) {
      clearInterval(this._loadingTipInterval);
      this._loadingTipInterval = null;
    }
    if (this._loadingTimerInterval) {
      clearInterval(this._loadingTimerInterval);
      this._loadingTimerInterval = null;
    }
    if (this._loadingTimeout) {
      clearTimeout(this._loadingTimeout);
      this._loadingTimeout = null;
    }
    if (this._loadingEl) {
      this._loadingEl.classList.add("hidden");
    }
  }

  unmount(): void {
    if (this._onLocationComplete) {
      this.events.off("locationComplete", this._onLocationComplete);
      this._onLocationComplete = null;
    }
    if (this._onMapComplete) {
      this.events.off("mapComplete", this._onMapComplete);
      this._onMapComplete = null;
    }
    if (this._onPlayerDied) {
      this.events.off("playerDied", this._onPlayerDied);
      this._onPlayerDied = null;
    }
    if (this._onCombatReady) {
      this.events.off("combatReady", this._onCombatReady);
      this._onCombatReady = null;
    }
    if (this._onPlayerBanned) {
      this.events.off("playerBanned", this._onPlayerBanned);
      this._onPlayerBanned = null;
    }
    // Clean up action bar (potions + keyboard)
    this._cleanupPotions?.();
    this._cleanupPotions = null;
    this._cleanupKeyboard?.();
    this._cleanupKeyboard = null;
    // Clean up loading overlay timers
    this._stopLoadingOverlay();

    if (this.battleScene) {
      this.battleScene.destroy();
      this.battleScene = null;
    }
    if (this.combatLog) {
      this.combatLog.destroy();
      this.combatLog = null;
    }
    if (this.equipment) {
      this.equipment.destroy();
      this.equipment = null;
    }

    this.container.innerHTML = "";

    // Clean up WebSocket listeners to prevent leaks
    if (this.combat) {
      this.combat.cleanup();
    }

    if (this.effects) {
      this.effects.destroy();
    }

    this.combat = null;
    this.hud = null;
    this.effects = null;
  }
}
