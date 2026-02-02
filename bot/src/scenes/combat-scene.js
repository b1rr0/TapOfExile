import { CombatManager } from "../game/combat.js";
import { BattleScene } from "../ui/battle-scene.js";
import { Effects } from "../ui/effects.js";
import { HUD } from "../ui/hud.js";
import { Equipment } from "../ui/equipment.js";
import { haptic } from "../utils/haptic.js";
import { isActComplete, getBackgroundForLocation, getActModifiers } from "../data/locations.js";

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
  }

  /**
   * Mount the combat scene — build DOM, wire everything up, start combat.
   * @param {Object} [params]
   */
  mount(params = {}) {
    // Determine location name + monster level for the top bar
    const locationName = params.location ? params.location.name : "Battle";
    const monsterLvl = params.location ? params.location.order : null;
    const stageLabel = monsterLvl
      ? `${locationName} · Lv.${monsterLvl}`
      : locationName;

    // Build modifiers panel HTML
    const actNumber = params.location ? params.location.act : 1;
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

    // Determine background for this location
    const backgroundSrc = params.location
      ? getBackgroundForLocation(params.location)
      : null;

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
    }, 1000);

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

    // 6. Emit stateLoaded so HUD picks up current values
    this.events.emit("stateLoaded", this.state.data);

    // 7. Start combat — location-based or legacy infinite
    if (params.location) {
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
