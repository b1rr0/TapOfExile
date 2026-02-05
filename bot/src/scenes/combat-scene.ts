import { CombatManager } from "../game/combat.js";
import { BattleScene } from "../ui/battle-scene.js";
import { Effects } from "../ui/effects.js";
import { HUD } from "../ui/hud.js";
import { Equipment } from "../ui/equipment.js";
import { haptic } from "../utils/haptic.js";
import { isActComplete, getBackgroundForLocation, getActModifiers, getLocationById, ACT_BACKGROUNDS } from "../data/locations.js";
import { B } from "../data/balance.js";
import type { SharedDeps, Location } from "../types.js";

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
  hud: HUD | null;
  equipment: Equipment | null;

  // Intervals / refs
  _dpsInterval: ReturnType<typeof setInterval> | null;
  _tapHandler: (() => void) | null;
  _onLocationComplete: ((data: any) => void) | null;
  _onMapComplete: ((data: any) => void) | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this.combat = null;
    this.battleScene = null;
    this.effects = null;
    this.hud = null;
    this.equipment = null;

    this._dpsInterval = null;
    this._tapHandler = null;
    this._onLocationComplete = null;
    this._onMapComplete = null;
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
      stageLabel = monsterLvl
        ? `${locationName} · Lv.${monsterLvl}`
        : locationName;
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

    const playerData = this.state.data.player;
    const playerLevel = playerData ? playerData.level : 1;
    const playerXp = playerData ? playerData.xp : 0;
    const playerXpToNext = playerData ? playerData.xpToNext : 100;

    this.container.innerHTML = `
      <div id="game-screen" class="screen combat-screen">
        <div id="hud" class="hud">
          <div class="hud-center">
            <span id="stage-display" class="stage-display">${stageLabel}</span>
          </div>
        </div>

        <div id="battle-scene" class="battle-scene"></div>

        <div class="action-bar">
          <div class="action-bar__xp-row">
            <span id="level-display" class="action-bar__level">Lv.${playerLevel}</span>
            <div class="xp-bar action-bar__xp" id="xp-bar">
              <div class="xp-bar__fill" id="xp-bar-fill"></div>
              <div class="xp-bar__text" id="xp-bar-text">${playerXp} / ${playerXpToNext}</div>
            </div>
          </div>
          <div class="action-bar__abilities">
            <button class="action-slot action-slot--ability" id="ability-0" data-slot="0">
              <span class="action-slot__key">1</span>
              <div class="action-slot__cooldown"></div>
            </button>
            <button class="action-slot action-slot--ability" id="ability-1" data-slot="1">
              <span class="action-slot__key">2</span>
              <div class="action-slot__cooldown"></div>
            </button>
            <button class="action-slot action-slot--ability" id="ability-2" data-slot="2">
              <span class="action-slot__key">3</span>
              <div class="action-slot__cooldown"></div>
            </button>
            <button class="action-slot action-slot--ability" id="ability-3" data-slot="3">
              <span class="action-slot__key">4</span>
              <div class="action-slot__cooldown"></div>
            </button>
          </div>
          <div class="action-bar__bottom">
            <div class="action-bar__stats">
              <div class="action-bar__hp-bar">
                <div class="action-bar__hp-fill" id="player-hp-fill"></div>
                <span class="action-bar__hp-text" id="player-hp-text">100 / 100</span>
              </div>
              <div class="action-bar__defense">
                <div class="action-bar__stat">
                  <span class="action-bar__stat-icon">🛡️</span>
                  <span class="action-bar__stat-value" id="player-armor">0</span>
                </div>
                <div class="action-bar__stat action-bar__stat--dodge">
                  <span class="action-bar__stat-icon">💨</span>
                  <span class="action-bar__stat-value" id="player-dodge">0%</span>
                </div>
                <div class="action-bar__stat action-bar__stat--fire">
                  <span class="action-bar__stat-icon">🔥</span>
                  <span class="action-bar__stat-value" id="player-fire-res">0%</span>
                </div>
                <div class="action-bar__stat action-bar__stat--lightning">
                  <span class="action-bar__stat-icon">⚡</span>
                  <span class="action-bar__stat-value" id="player-lightning-res">0%</span>
                </div>
                <div class="action-bar__stat action-bar__stat--cold">
                  <span class="action-bar__stat-icon">❄️</span>
                  <span class="action-bar__stat-value" id="player-cold-res">0%</span>
                </div>
              </div>
            </div>
            <div class="action-bar__potions">
              <button class="action-slot action-slot--potion" id="potion-0" data-potion="0">
                <span class="action-slot__key">Q</span>
                <span class="action-slot__count"></span>
                <div class="action-slot__cooldown"></div>
              </button>
              <button class="action-slot action-slot--potion" id="potion-1" data-potion="1">
                <span class="action-slot__key">E</span>
                <span class="action-slot__count"></span>
                <div class="action-slot__cooldown"></div>
              </button>
            </div>
          </div>
        </div>

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

        ${modsHtml}
      </div>
    `;

    const gameScreen = this.container.querySelector("#game-screen") as HTMLElement;
    const hudEl = this.container.querySelector("#hud") as HTMLElement;
    const battleEl = this.container.querySelector("#battle-scene") as HTMLElement;

    this.combat = new CombatManager(this.state, this.events);
    this.hud = new HUD(hudEl, this.events);

    const activeChar = this.state.getActiveCharacter();
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
    this.effects = new Effects(battleEl, this.events);
    this.equipment = new Equipment(gameScreen, this.events);

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

    this._dpsInterval = setInterval(() => {
      this.combat!.applyPassiveDamage();
    }, B.PASSIVE_DPS_TICK_MS);

    // Listen for location complete — server already persisted everything
    this._onLocationComplete = (data: any) => {
      const completed: string[] = this.state.data.locations?.completed || [];
      const locActNumber = params.location ? params.location.act : 1;

      const wasAlreadyComplete = isActComplete(locActNumber, completed);
      const isNowComplete = isActComplete(locActNumber, completed);
      const actJustCompleted = !wasAlreadyComplete && isNowComplete;

      const locName = params.location ? params.location.name : "Unknown";

      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: locName,
          rewards: data.rewards,
          actComplete: actJustCompleted ? locActNumber : null,
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

      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: mapName,
          rewards: { gold: data.totalGold, xp: data.totalXp },
          mapDrops,
          isMapVictory: true,
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

  unmount(): void {
    if (this._dpsInterval) {
      clearInterval(this._dpsInterval);
      this._dpsInterval = null;
    }

    if (this._onLocationComplete) {
      this.events.off("locationComplete", this._onLocationComplete);
      this._onLocationComplete = null;
    }
    if (this._onMapComplete) {
      this.events.off("mapComplete", this._onMapComplete);
      this._onMapComplete = null;
    }

    if (this.battleScene) {
      this.battleScene.destroy();
      this.battleScene = null;
    }
    if (this.equipment) {
      this.equipment.destroy();
      this.equipment = null;
    }

    this.container.innerHTML = "";

    this.combat = null;
    this.hud = null;
    this.effects = null;
  }
}
