import { LOCATIONS } from "../data/locations.js";

/**
 * MapScene — scroll-list of location cards.
 *
 * Statuses: locked / completed / available.
 * Tap available or completed → switchTo("combat", { location }).
 * "Back" button → hideout.
 */
export class MapScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;
  }

  mount(params = {}) {
    const completed = this.state.data.locations.completed || [];

    const cards = LOCATIONS.map((loc) => {
      const isCompleted = completed.includes(loc.id);
      const isUnlocked = !loc.requiredLocationId || completed.includes(loc.requiredLocationId);

      let status, statusIcon, cardClass;
      if (isCompleted) {
        status = "completed";
        statusIcon = "\u2705";
        cardClass = "location-card--completed";
      } else if (isUnlocked) {
        status = "available";
        statusIcon = "\u25B6";
        cardClass = "location-card--available";
      } else {
        status = "locked";
        statusIcon = "\uD83D\uDD12";
        cardClass = "location-card--locked";
      }

      return `
        <div class="location-card ${cardClass}" data-id="${loc.id}" data-status="${status}">
          <div class="location-card__icon">${statusIcon}</div>
          <div class="location-card__info">
            <div class="location-card__name">${loc.name}</div>
            <div class="location-card__desc">${loc.description}</div>
          </div>
          <div class="location-card__rewards">
            <span class="location-card__gold">&#9789; ${loc.rewards.gold}</span>
            <span class="location-card__xp">XP ${loc.rewards.xp}</span>
          </div>
        </div>
      `;
    }).join("");

    this.container.innerHTML = `
      <div class="map">
        <div class="map-header">
          <button class="map-back-btn" id="map-back-btn">&#x2190;</button>
          <h2 class="map-title">Map</h2>
        </div>
        <div class="map-list" id="map-list">
          ${cards}
        </div>
      </div>
    `;

    // Back button
    this.container.querySelector("#map-back-btn").addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    // Card clicks
    this.container.querySelector("#map-list").addEventListener("click", (e) => {
      const card = e.target.closest(".location-card");
      if (!card) return;

      const status = card.dataset.status;
      if (status === "locked") return;

      const locId = card.dataset.id;
      const location = LOCATIONS.find((l) => l.id === locId);
      if (location) {
        this.sceneManager.switchTo("combat", { location });
      }
    });
  }

  unmount() {
    this.container.innerHTML = "";
  }
}
