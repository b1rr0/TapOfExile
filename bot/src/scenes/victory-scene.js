import { formatNumber } from "../utils/format.js";

/**
 * VictoryScene — shown after completing a location.
 *
 * Displays "Victory!", gold and XP rewards.
 * "Continue" button → hideout.
 */
export class VictoryScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;
  }

  /**
   * @param {Object} params
   * @param {string} params.locationName
   * @param {Object} params.rewards — { gold, xp }
   */
  mount(params = {}) {
    const { locationName = "Unknown", rewards = { gold: 0, xp: 0 } } = params;

    this.container.innerHTML = `
      <div class="victory">
        <div class="victory-content">
          <div class="victory-title">Victory!</div>
          <div class="victory-location">${locationName}</div>
          <div class="victory-rewards">
            <div class="victory-reward">
              <span class="victory-reward__icon">&#9789;</span>
              <span class="victory-reward__value">+${formatNumber(rewards.gold)}</span>
            </div>
            <div class="victory-reward">
              <span class="victory-reward__icon">&#x2B50;</span>
              <span class="victory-reward__value">+${rewards.xp} XP</span>
            </div>
          </div>
          <button class="victory-btn" id="victory-continue">Continue</button>
        </div>
      </div>
    `;

    this.container.querySelector("#victory-continue").addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });
  }

  unmount() {
    this.container.innerHTML = "";
  }
}
