import { formatNumber } from "../utils/format.js";
import { TOTAL_ACTS } from "../data/locations.js";

/**
 * VictoryScene — shown after completing a location.
 *
 * Displays "Victory!", gold and XP rewards.
 * Optionally shows "Act X Complete!" banner when the act's main chain is finished.
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
   * @param {number|null} [params.actComplete] — act number if the act was just completed
   */
  mount(params = {}) {
    const { locationName = "Unknown", rewards = { gold: 0, xp: 0 }, actComplete = null } = params;

    // Act completion banner
    let actBanner = "";
    if (actComplete) {
      const subtitle = actComplete < TOTAL_ACTS
        ? `Act ${actComplete + 1} Unlocked`
        : "All Acts Complete!";
      actBanner = `
        <div class="victory-act-complete">
          <div class="victory-act-complete__title">Act ${actComplete} Complete!</div>
          <div class="victory-act-complete__subtitle">${subtitle}</div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="victory">
        <div class="victory-content">
          ${actBanner}
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
