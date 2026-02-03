import { formatNumber } from "../utils/format.js";
import { TOTAL_ACTS } from "../data/locations.js";

/**
 * VictoryScene — shown after completing a location or endgame map.
 *
 * Displays "Victory!", gold and XP rewards.
 * Optionally shows "Act X Complete!" banner when the act's main chain is finished.
 * For map victories, shows dropped map keys.
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
   * @param {boolean} [params.isMapVictory] — true if this was an endgame map
   * @param {Object[]} [params.mapDrops] — array of dropped map key items
   */
  mount(params = {}) {
    const {
      locationName = "Unknown",
      rewards = { gold: 0, xp: 0 },
      actComplete = null,
      isMapVictory = false,
      mapDrops = [],
    } = params;

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

    // Map drops section
    let mapDropsHtml = "";
    if (mapDrops.length > 0) {
      const dropItems = mapDrops.map(d =>
        `<div class="victory-map-drop victory-map-drop--${d.quality}">
          <span class="victory-map-drop__icon">${d.icon}</span>
          <span class="victory-map-drop__name">${d.name}</span>
        </div>`
      ).join("");
      mapDropsHtml = `
        <div class="victory-map-drops">
          <div class="victory-map-drops__title">Map Drops</div>
          ${dropItems}
        </div>
      `;
    } else if (isMapVictory) {
      mapDropsHtml = `
        <div class="victory-map-drops">
          <div class="victory-map-drops__title">Map Drops</div>
          <div class="victory-map-drops__empty">No map keys dropped</div>
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
          ${mapDropsHtml}
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
