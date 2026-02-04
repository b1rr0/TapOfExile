import {
  getLocationsForAct,
  getHighestUnlockedAct,
  getScaledRewards,
  getActModifiers,
  TOTAL_ACTS,
  ACT_DEFINITIONS,
  ALL_LOCATIONS,
} from "../data/locations.js";
import { IS_TESTING } from "../main.js";
import type { SharedDeps, Location, ActModifier } from "../types.js";

/**
 * MapScene — scroll-list of location cards with act tabs.
 *
 * Tab bar at the top lets the player switch between acts.
 * Only completed acts and the current (highest unlocked) act are accessible.
 *
 * Statuses: locked / completed / available.
 * Tap available or completed -> switchTo("combat", { location }).
 * "Back" button -> hideout.
 */
export class MapScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  _selectedAct: number;
  _cardClickHandler: ((e: MouseEvent) => void) | null;
  _endgameUnlocked: boolean;
  _listEl: HTMLElement | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._selectedAct = 1;
    this._cardClickHandler = null;
    this._endgameUnlocked = false;
    this._listEl = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    // In testing mode, treat all locations as completed and all acts as unlocked
    const completed: string[] = IS_TESTING
      ? ALL_LOCATIONS.map((l: Location) => l.id)
      : (this.state.data.locations.completed || []);
    const highestAct: number = IS_TESTING ? TOTAL_ACTS : getHighestUnlockedAct(completed);

    // Check endgame unlock
    const char = this.state.getActiveCharacter();
    this._endgameUnlocked = IS_TESTING || (char && char.endgame && char.endgame.unlocked);

    // Restore last viewed act (clamped to unlocked range)
    this._selectedAct = Math.min(
      this.state.data.locations.currentAct || highestAct,
      highestAct
    );

    // Build tab bar
    const tabs = this._buildTabs(highestAct);

    this.container.innerHTML = `
      <div class="map">
        <div class="map-header">
          <button class="map-back-btn" id="map-back-btn">&#x2190;</button>
          <h2 class="map-title">Map</h2>
        </div>
        <div class="map-tabs" id="map-tabs">${tabs}</div>
        <div class="map-list" id="map-list"></div>
      </div>
    `;

    // Cache list element
    this._listEl = this.container.querySelector("#map-list");

    // Delegated click on #map-list — handles both cards and mods toggle
    this._listEl!.addEventListener("click", (e: MouseEvent) => {
      // Modifiers toggle
      const toggle = (e.target as HTMLElement).closest("#map-mod-toggle");
      if (toggle) {
        const panel = this._listEl!.querySelector("#map-mod-panel") as HTMLElement | null;
        if (panel) {
          panel.classList.toggle("map-modifiers__panel--hidden");
          const arrow = toggle.querySelector(".map-modifiers__arrow") as HTMLElement | null;
          if (arrow) {
            arrow.textContent = panel.classList.contains("map-modifiers__panel--hidden") ? "\u25BC" : "\u25B2";
          }
        }
        return;
      }
      // Location card click
      const card = (e.target as HTMLElement).closest(".location-card") as HTMLElement | null;
      if (!card || card.dataset.status === "locked") return;
      const locId = card.dataset.id;
      const locations: Location[] = getLocationsForAct(this._selectedAct);
      const location = locations.find((l) => l.id === locId);
      if (location) {
        this.sceneManager.switchTo("combat", { location });
      }
    });

    // Render cards for the selected act
    this._renderCards();

    // Back button
    (this.container.querySelector("#map-back-btn") as HTMLButtonElement).addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    // Tab clicks
    (this.container.querySelector("#map-tabs") as HTMLElement).addEventListener("click", (e: MouseEvent) => {
      const tab = (e.target as HTMLElement).closest(".map-tab") as HTMLElement | null;
      if (!tab) return;
      if (tab.classList.contains("map-tab--locked")) return;

      // Endgame tab -> switch to Map Device scene
      if (tab.dataset.act === "endgame") {
        this.sceneManager.switchTo("mapDevice");
        return;
      }

      const act = Number(tab.dataset.act);
      this._switchAct(act, highestAct);
    });

    // Swipe left/right on the card list to switch acts
    this._initSwipe(highestAct);
  }

  /* -- Tab bar -------------------------------------------- */

  _buildTabs(highestAct: number): string {
    let html = "";
    for (let a = 1; a <= TOTAL_ACTS; a++) {
      const def = ACT_DEFINITIONS[a - 1];
      const label: string = def ? def.name : `Act ${a}`;

      let cls = "map-tab";
      if (a === this._selectedAct) {
        cls += " map-tab--active";
      } else if (a <= highestAct) {
        cls += " map-tab--unlocked";
      } else {
        cls += " map-tab--locked";
      }
      html += `<button class="${cls}" data-act="${a}">${label}</button>`;
    }

    // Endgame tab (shown when all acts complete)
    if (this._endgameUnlocked) {
      html += `<button class="map-tab map-tab--endgame map-tab--unlocked" data-act="endgame">Endgame</button>`;
    }

    return html;
  }

  _updateTabVisuals(highestAct: number): void {
    const tabs = this.container.querySelectorAll(".map-tab") as NodeListOf<HTMLElement>;
    tabs.forEach((tab) => {
      // Skip endgame tab — it manages its own classes
      if (tab.dataset.act === "endgame") return;

      const a = Number(tab.dataset.act);
      tab.className = "map-tab";
      if (a === this._selectedAct) {
        tab.classList.add("map-tab--active");
      } else if (a <= highestAct) {
        tab.classList.add("map-tab--unlocked");
      } else {
        tab.classList.add("map-tab--locked");
      }
    });
  }

  /* -- Act switching -------------------------------------- */

  _switchAct(act: number, highestAct: number): void {
    if (act < 1 || act > highestAct) return;
    if (act === this._selectedAct) return;

    this._selectedAct = act;
    this.state.data.locations.currentAct = act;
    this.state.scheduleSave();

    this._updateTabVisuals(highestAct);
    this._renderCards();
  }

  /* -- Swipe navigation ----------------------------------- */

  _initSwipe(highestAct: number): void {
    const mapEl = this.container.querySelector(".map") as HTMLElement | null;
    if (!mapEl) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    // Use pointer events — work on both touch and mouse (desktop testing)
    mapEl.addEventListener("pointerdown", (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    });

    mapEl.addEventListener("pointerup", (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Only trigger if horizontal swipe is dominant and long enough
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;

      if (dx < 0) {
        // Swipe left -> next act
        this._switchAct(this._selectedAct + 1, highestAct);
      } else {
        // Swipe right -> previous act
        this._switchAct(this._selectedAct - 1, highestAct);
      }
    });

    // Cancel tracking if pointer leaves the map area
    mapEl.addEventListener("pointercancel", () => { tracking = false; });
  }

  /* -- Modifiers banner ----------------------------------- */

  _renderModifiersBanner(): string {
    const mods: ActModifier[] = getActModifiers(this._selectedAct);
    if (!mods.length) return "";

    const buffs = mods.filter(m => m.type === "buff");
    const debuffs = mods.filter(m => m.type === "debuff");

    const renderList = (items: ActModifier[], cls: string): string => items.map(m =>
      `<div class="mod-chip mod-chip--${cls}" title="${m.description}">
        <span class="mod-chip__icon">${m.icon}</span>
        <span class="mod-chip__name">${m.name}</span>
      </div>`
    ).join("");

    return `
      <div class="map-modifiers" id="map-modifiers">
        <button class="map-modifiers__toggle" id="map-mod-toggle">
          <span class="map-modifiers__toggle-icons">${mods.map(m => m.icon).join("")}</span>
          <span class="map-modifiers__toggle-label">Effects</span>
          <span class="map-modifiers__arrow">&#9660;</span>
        </button>
        <div class="map-modifiers__panel map-modifiers__panel--hidden" id="map-mod-panel">
          ${buffs.length ? `<div class="mod-section"><div class="mod-section__title mod-section__title--buff">Buffs</div>${renderList(buffs, "buff")}</div>` : ""}
          ${debuffs.length ? `<div class="mod-section"><div class="mod-section__title mod-section__title--debuff">Debuffs</div>${renderList(debuffs, "debuff")}</div>` : ""}
        </div>
      </div>
    `;
  }

  /* -- Card list ------------------------------------------ */

  _renderCards(): void {
    const completed: string[] = IS_TESTING
      ? ALL_LOCATIONS.map((l: Location) => l.id)
      : (this.state.data.locations.completed || []);
    const locations: Location[] = getLocationsForAct(this._selectedAct);
    const listEl = this._listEl;
    if (!listEl) return;

    const modsBanner = this._renderModifiersBanner();

    const cards = locations.map((loc) => {
      const isCompleted = completed.includes(loc.id);
      const isUnlocked = !loc.requiredLocationId || completed.includes(loc.requiredLocationId);

      let status: string, statusIcon: string, cardClass: string;
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

      const scaled = getScaledRewards(loc);

      return `
        <div class="location-card ${cardClass}" data-id="${loc.id}" data-status="${status}">
          <div class="location-card__icon">${statusIcon}</div>
          <div class="location-card__info">
            <div class="location-card__name">${loc.name}</div>
            <div class="location-card__desc">${loc.description}</div>
          </div>
          <div class="location-card__rewards">
            <span class="location-card__gold">&#9789; ${scaled.gold}</span>
            <span class="location-card__xp">XP ${scaled.xp}</span>
          </div>
        </div>
      `;
    }).join("");

    listEl.innerHTML = modsBanner + cards;
  }

  unmount(): void {
    this.container.innerHTML = "";
    this._listEl = null;
  }
}
