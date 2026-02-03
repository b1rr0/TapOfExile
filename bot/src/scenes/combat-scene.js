import { CombatManager } from "../game/combat.js";
import { BattleScene } from "../ui/battle-scene.js";
import { Effects } from "../ui/effects.js";
import { HUD } from "../ui/hud.js";
import { Equipment } from "../ui/equipment.js";
import { haptic } from "../utils/haptic.js";
import { isActComplete, getBackgroundForLocation, getActModifiers, getLocationById, ACT_BACKGROUNDS } from "../data/locations.js";
import { rollMapDrops } from "../data/endgame-maps.js";
import { B } from "../data/balance.js";

/**
 * CombatScene — wraps the current battle flow into a single scene.
 *
 * Creates all DOM (HUD, battle-scene, tap-zone), wires
 * BattleScene, Effects, HUD, tap-handler, passive DPS interval.
 *
 * Lifecycle: mount(params) / unmount() with full cleanup.
 */
export class CombatScene {
  /**
   * @param {HTMLElement} container — scene-container element
   * @param {Object} deps — { events, state }
   */
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    // Sub-systems (created in mount)
    this.combat = null;
    this.battleScene = null;
    this.effects = null;
    this.hud = null;
    this.equipment = null;

    // Intervals / refs
    this._dpsInterval = null;
    this._tapHandler = null;
    this._onLocationComplete = null;
    this._onMapComplete = null;
  }

  /**
   * Mount the combat scene — build DOM, wire everything up, start combat.
   * @param {Object} [params]
   */
  mount(params = {}) {
    const isMapMode = !!params.mapConfig;

    // Determine location name + monster level for the top bar
    let stageLabel;
    let mapLocation = null;   // resolved location for map mode
    if (isMapMode) {
      const mc = params.mapConfig;
      if (mc.isBoss) {
        stageLabel = mc.bossDef.name;
      } else {
        // Use the map key's location name
        mapLocation = mc.locationId ? getLocationById(mc.locationId) : null;
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

    // Build modifiers panel HTML — map mode uses the key's location act
    const actNumber = isMapMode
      ? (params.mapConfig.locationAct || 5)
      : (params.location ? params.location.act : 1);
    const mods = getActModifiers(actNumber);
    let modsHtml = "";
    if (mods.length) {
      const chips = mods.map(m =>
        `<div class="combat-mod combat-mod--${m.type}"><span class="combat-mod__icon">${m.icon}</span><span class="combat-mod__name">${m.name}</span><span class="combat-mod__desc">${m.description}</span></div>`
      ).join("");
      modsHtml = `
        <button class="combat-mods-toggle" id="combat-mods-toggle">${mods.map(m => m.icon).join("")}</button>
        <div class="combat-mods-panel combat-mods-panel--hidden" id="combat-mods-panel">
          <div class="combat-mods-panel__title">Zone Effects</div>
          ${chips}
        </div>
      `;
    }

    // 1. Build DOM
    this.container.innerHTML = `
      <div id="game-screen" class="screen">
        <!-- Top bar — room name + monster level -->
        <div id="hud" class="hud">
          <div class="hud-center">
            <span id="stage-display" class="stage-display">${stageLabel}</span>
          </div>
        </div>

        <!-- Battle scene -->
        <div id="battle-scene" class="battle-scene"></div>

        <!-- Flee confirmation overlay -->
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

        <!-- Zone modifiers — sits on top of battle scene, outside BattleScene container -->
        ${modsHtml}

        <!-- Bottom bar: XP + level above tap zone -->
        <div class="combat-bottom-bar">
          <div class="bottom-xp-row">
            <span id="level-display" class="bottom-level-display">Lv.${this.state.data.player.level}</span>
            <div class="xp-bar bottom-xp-bar" id="xp-bar">
              <div class="xp-bar__fill" id="xp-bar-fill"></div>
              <div class="xp-bar__text" id="xp-bar-text">${this.state.data.player.xp} / ${this.state.data.player.xpToNext}</div>
            </div>
          </div>
          <div class="tap-zone">
            <button id="tap-btn" class="tap-button">ATTACK</button>
            <div id="dps-display" class="dps-display">DPS: 0</div>
          </div>
        </div>
      </div>
    `;

    // 2. Create sub-systems
    const gameScreen = this.container.querySelector("#game-screen");
    const hudEl = this.container.querySelector("#hud");
    const battleEl = this.container.querySelector("#battle-scene");
    const tapBtn = this.container.querySelector("#tap-btn");

    this.combat = new CombatManager(this.state, this.events);
    this.hud = new HUD(hudEl, this.events);

    // Use active character's skin for the hero sprite
    const activeChar = this.state.getActiveCharacter();
    const heroSkin = activeChar ? activeChar.skinId : "samurai_1";

    // Determine background for this location / map
    let backgroundSrc = null;
    if (isMapMode) {
      // Use the map key's location for background (same as story)
      if (mapLocation) {
        backgroundSrc = getBackgroundForLocation(mapLocation);
      } else {
        // Boss maps or fallback — use cave backgrounds
        const caveImages = ACT_BACKGROUNDS[5] || [];
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

    // Exit button — appended after BattleScene init (which wipes innerHTML)
    const exitBtn = document.createElement("button");
    exitBtn.className = "battle-exit-btn";
    exitBtn.id = "flee-btn";
    exitBtn.textContent = "🚪";
    battleEl.appendChild(exitBtn);

    // 3. Tap handler
    this._tapHandler = () => {
      this.combat.handleTap();
      haptic("light");
    };
    tapBtn.addEventListener("click", this._tapHandler);

    // 3b. Modifiers panel toggle
    const modsToggle = this.container.querySelector("#combat-mods-toggle");
    const modsPanel = this.container.querySelector("#combat-mods-panel");
    if (modsToggle && modsPanel) {
      modsToggle.addEventListener("click", () => {
        modsPanel.classList.toggle("combat-mods-panel--hidden");
      });
    }

    // 3c. Flee button — show confirmation dialog
    const fleeOverlay = this.container.querySelector("#flee-confirm");
    this.container.querySelector("#flee-btn").addEventListener("click", () => {
      fleeOverlay.classList.remove("flee-confirm-overlay--hidden");
    });
    this.container.querySelector("#flee-cancel").addEventListener("click", () => {
      fleeOverlay.classList.add("flee-confirm-overlay--hidden");
    });
    this.container.querySelector("#flee-leave").addEventListener("click", () => {
      fleeOverlay.classList.add("flee-confirm-overlay--hidden");
      if (this.sceneManager) {
        this.sceneManager.switchTo("hideout");
      }
    });

    // 4. Passive DPS tick every second
    this._dpsInterval = setInterval(() => {
      this.combat.applyPassiveDamage();
    }, B.PASSIVE_DPS_TICK_MS);

    // 5. Listen for location complete
    this._onLocationComplete = (data) => {
      const completed = this.state.data.locations.completed;
      const actNumber = params.location ? params.location.act : 1;

      // Was the act already complete before this location?
      const wasAlreadyComplete = isActComplete(actNumber, completed);

      // Mark location as completed (avoid duplicates)
      if (!completed.includes(data.locationId)) {
        completed.push(data.locationId);
      }
      this.state.save();

      // Show act banner only if this location just completed the act
      const isNowComplete = isActComplete(actNumber, completed);
      const actJustCompleted = !wasAlreadyComplete && isNowComplete;

      const locName = params.location ? params.location.name : "Unknown";

      console.log(`[CombatScene] locationComplete: ${data.locationId}`, data.rewards);

      // Navigate to victory scene
      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: locName,
          rewards: data.rewards,
          actComplete: actJustCompleted ? actNumber : null,
        });
      }
    };
    this.events.on("locationComplete", this._onLocationComplete);

    // 5b. Listen for map complete (endgame)
    this._onMapComplete = (data) => {
      const mc = data.mapConfig;
      const tier = mc.tier || 10;
      const isBoss = mc.isBoss || false;

      // Roll map drops (direction determines which boss key can drop)
      const direction = mc.direction || null;
      const mapDrops = rollMapDrops(tier, isBoss, direction);

      // Add dropped keys to bag
      for (const drop of mapDrops) {
        this.state.addMapKeyToBag(drop);
      }

      // Update endgame stats
      const char = this.state.getActiveCharacter();
      if (char && char.endgame) {
        char.endgame.totalMapsRun++;
        if (!isBoss && tier > char.endgame.highestTierCompleted) {
          char.endgame.highestTierCompleted = tier;
        }
        if (isBoss && mc.bossId && !char.endgame.completedBosses.includes(mc.bossId)) {
          char.endgame.completedBosses.push(mc.bossId);
        }
      }
      this.state.save();

      const mapName = isBoss
        ? mc.bossDef.name
        : `Tier ${tier} Map`;

      console.log(`[CombatScene] mapComplete: ${mapName}`, {
        gold: data.totalGold,
        xp: data.totalXp,
        drops: mapDrops.length,
      });

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

    // 6. Emit stateLoaded so HUD picks up current values
    this.events.emit("stateLoaded", this.state.data);

    // 7. Start combat — map-based, location-based, or legacy infinite
    if (isMapMode) {
      this.combat.startMap(params.mapConfig);
    } else if (params.location) {
      this.combat.startLocation(params.location);
    } else {
      this.combat.init();
    }
  }

  /**
   * Unmount — full cleanup of DOM, intervals, sub-systems.
   */
  unmount() {
    // Stop passive DPS
    if (this._dpsInterval) {
      clearInterval(this._dpsInterval);
      this._dpsInterval = null;
    }

    // Remove event listeners
    if (this._onLocationComplete) {
      this.events.off("locationComplete", this._onLocationComplete);
      this._onLocationComplete = null;
    }
    if (this._onMapComplete) {
      this.events.off("mapComplete", this._onMapComplete);
      this._onMapComplete = null;
    }

    // Cleanup sub-systems
    if (this.battleScene) {
      this.battleScene.destroy();
      this.battleScene = null;
    }
    if (this.equipment) {
      this.equipment.destroy();
      this.equipment = null;
    }

    // Clear DOM
    this.container.innerHTML = "";

    this.combat = null;
    this.hud = null;
    this.effects = null;
  }
}
