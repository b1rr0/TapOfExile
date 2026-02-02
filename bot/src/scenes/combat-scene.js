import { CombatManager } from "../game/combat.js";
import { BattleScene } from "../ui/battle-scene.js";
import { Effects } from "../ui/effects.js";
import { HUD } from "../ui/hud.js";
import { Inventory } from "../ui/inventory.js";
import { haptic } from "../utils/haptic.js";

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
    this.inventory = null;

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
    // Determine location name for the top bar
    const locationName = params.location ? params.location.name : "Battle";

    // 1. Build DOM
    this.container.innerHTML = `
      <div id="game-screen" class="screen">
        <!-- Top bar — location name + flee -->
        <div id="hud" class="hud">
          <button class="hud-flee-btn" id="flee-btn">&larr;</button>
          <div class="hud-center">
            <span id="stage-display" class="stage-display">${locationName}</span>
          </div>
        </div>

        <!-- Battle scene -->
        <div id="battle-scene" class="battle-scene"></div>

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
    this.battleScene = new BattleScene(battleEl, this.events, { heroSkin });
    this.effects = new Effects(battleEl, this.events);
    this.inventory = new Inventory(gameScreen, this.events);

    // 3. Tap handler
    this._tapHandler = () => {
      this.combat.handleTap();
      haptic("light");
    };
    tapBtn.addEventListener("click", this._tapHandler);

    // 3b. Flee button — exit combat with no rewards
    this.container.querySelector("#flee-btn").addEventListener("click", () => {
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
      // Mark location as completed (avoid duplicates)
      const completed = this.state.data.locations.completed;
      if (!completed.includes(data.locationId)) {
        completed.push(data.locationId);
      }
      this.state.save();

      // Find location name for victory screen
      const locName = params.location ? params.location.name : "Unknown";

      console.log(`[CombatScene] locationComplete: ${data.locationId}`, data.rewards);

      // Navigate to victory scene
      if (this.sceneManager) {
        this.sceneManager.switchTo("victory", {
          locationName: locName,
          rewards: data.rewards,
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
    if (this.inventory) {
      this.inventory.destroy();
      this.inventory = null;
    }

    // Clear DOM
    this.container.innerHTML = "";

    this.combat = null;
    this.hud = null;
    this.effects = null;
  }
}
