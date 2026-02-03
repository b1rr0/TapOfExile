import {
  BOSS_MAPS,
  MAP_KEY_TYPES,
  getTierDef,
  getBossDef,
  getBossKeyTierDef,
  getWavesForTier,
  getBossMapWaves,
  createMapKeyItem,
  createBossMapKeyItem,
} from "../data/endgame-maps.js";
import { getLocationById, getActModifiers } from "../data/locations.js";
import { IS_TESTING } from "../main.js";

/**
 * MapDeviceScene — endgame map device where players select and activate map keys.
 *
 * Regular Maps flow:  Select key → Choose direction (boss) → Activate
 * Boss Maps flow:     Select key → Activate (direction = boss automatically)
 *
 * Lifecycle: mount(params) / unmount()
 */
export class MapDeviceScene {
  constructor(container, deps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._selectedKey = null;
    this._selectedDirection = null;
    this._activeTab = "regular";

    // Cached DOM refs (set in mount)
    this._keysEl = null;
    this._slotEl = null;
    this._activateBtn = null;
  }

  mount(params = {}) {
    // In testing mode, seed some keys if the bag is empty
    if (IS_TESTING) {
      const keys = this.state.getMapKeys();
      if (keys.length === 0) {
        for (let t = 1; t <= 10; t++) {
          this.state.addMapKeyToBag(createMapKeyItem(t));
        }
        // Seed boss keys at all 3 tiers
        for (const boss of BOSS_MAPS) {
          for (let bt = 1; bt <= 3; bt++) {
            this.state.addMapKeyToBag(createBossMapKeyItem(boss.id, bt));
          }
        }
      }
    }

    this.container.innerHTML = `
      <div class="map-device">
        <div class="map-device__header">
          <button class="map-back-btn" id="md-back-btn">&#x2190;</button>
          <h2 class="map-device__title">Map Device</h2>
        </div>
        <div class="map-device__tabs" id="md-tabs">
          <button class="md-tab md-tab--active" data-tab="regular">Regular Maps</button>
          <button class="md-tab" data-tab="boss">Boss Maps</button>
        </div>
        <div class="map-device__slot" id="md-slot">
          <div class="md-slot__empty">Select a map key</div>
        </div>
        <div class="map-device__keys" id="md-keys"></div>
        <button class="map-device__activate-btn map-device__activate-btn--disabled"
                id="md-activate" disabled>Activate</button>
      </div>
    `;

    // Cache DOM refs once
    this._keysEl = this.container.querySelector("#md-keys");
    this._slotEl = this.container.querySelector("#md-slot");
    this._activateBtn = this.container.querySelector("#md-activate");

    // Back button
    this.container.querySelector("#md-back-btn").addEventListener("click", () => {
      this.sceneManager.switchTo("map");
    });

    // Tab clicks — delegated on stable #md-tabs
    this.container.querySelector("#md-tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".md-tab");
      if (!tab) return;
      const tabId = tab.dataset.tab;
      if (tabId === this._activeTab) return;

      this._activeTab = tabId;
      this._selectedKey = null;
      this._selectedDirection = null;
      this._updateTabVisuals();
      this._renderKeys();
      this._updateSlot();
      this._updateActivateBtn();
    });

    // Activate button
    this._activateBtn.addEventListener("click", () => {
      this._activateMap();
    });

    // Key selection — delegated on stable #md-keys
    this._keysEl.addEventListener("click", (e) => {
      const card = e.target.closest(".md-key-card");
      if (!card) return;
      const keyId = card.dataset.keyId;

      // If clicking the already selected key, do nothing
      if (this._selectedKey && this._selectedKey.id === keyId) return;

      const key = this.state.getMapKeys().find(k => k.id === keyId);
      if (!key) return;

      this._selectedKey = key;
      this._selectedDirection = null;
      // Toggle CSS classes instead of full re-render
      this._updateKeySelection(card);
      this._updateSlot();
      this._updateActivateBtn();
    });

    // Direction selection — delegated on stable #md-slot
    this._slotEl.addEventListener("click", (e) => {
      const card = e.target.closest(".md-direction-card");
      if (!card) return;
      const dir = card.dataset.direction;

      // If clicking the already selected direction, do nothing
      if (this._selectedDirection === dir) return;

      this._selectedDirection = dir;
      // Toggle CSS classes instead of full re-render
      this._updateDirectionSelection(card);
      this._updateActivateBtn();
    });

    this._renderKeys();
  }

  /* ── Tab visuals ─────────────────────────────────────────── */

  _updateTabVisuals() {
    const tabs = this.container.querySelectorAll(".md-tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("md-tab--active", tab.dataset.tab === this._activeTab);
    });
  }

  /* ── Key grid ────────────────────────────────────────────── */

  _renderKeys() {
    const allKeys = this.state.getMapKeys();
    const filtered = this._activeTab === "regular"
      ? allKeys.filter(k => k.type === MAP_KEY_TYPES.regular).sort((a, b) => a.tier - b.tier)
      : allKeys.filter(k => k.type === MAP_KEY_TYPES.boss);

    if (!this._keysEl) return;

    if (filtered.length === 0) {
      this._keysEl.innerHTML = `<div class="md-keys__empty">No map keys available</div>`;
      return;
    }

    if (this._activeTab === "regular") {
      this._keysEl.innerHTML = filtered.map((key) => {
        const tierDef = getTierDef(key.tier);
        const selected = this._selectedKey && this._selectedKey.id === key.id;
        return `
          <div class="md-key-card md-key-card--${key.quality}${selected ? " md-key-card--selected" : ""}"
               data-key-id="${key.id}">
            <span class="md-key-card__icon">\uD83D\uDDFA\uFE0F</span>
            <div class="md-key-card__info">
              <div class="md-key-card__name">${key.name}</div>
              <div class="md-key-card__detail">${tierDef.name}</div>
            </div>
          </div>
        `;
      }).join("");
    } else {
      this._keysEl.innerHTML = filtered
        .sort((a, b) => (a.bossKeyTier || 1) - (b.bossKeyTier || 1))
        .map((key) => {
          const bossDef = getBossDef(key.bossId);
          const bkt = getBossKeyTierDef(key.bossKeyTier || 1);
          const selected = this._selectedKey && this._selectedKey.id === key.id;
          return `
            <div class="md-key-card md-key-card--${key.quality || "boss_silver"}${selected ? " md-key-card--selected" : ""}"
                 data-key-id="${key.id}" data-boss-id="${key.bossId}">
              <span class="md-key-card__icon">${bossDef ? bossDef.icon : "\uD83D\uDC80"}</span>
              <div class="md-key-card__info">
                <div class="md-key-card__name">${bossDef ? bossDef.name : key.name}</div>
                <div class="md-key-card__detail">${bkt.name}</div>
              </div>
            </div>
          `;
        }).join("");
    }
  }

  /**
   * Toggle selected class on key cards without full re-render.
   * @param {HTMLElement} newCard — the newly clicked card
   */
  _updateKeySelection(newCard) {
    // Remove --selected from previous
    const prev = this._keysEl.querySelector(".md-key-card--selected");
    if (prev) prev.classList.remove("md-key-card--selected");
    // Add to new
    newCard.classList.add("md-key-card--selected");
  }

  /* ── Slot display ────────────────────────────────────────── */

  _updateSlot() {
    if (!this._slotEl) return;

    if (!this._selectedKey) {
      this._slotEl.innerHTML = `<div class="md-slot__empty">Select a map key</div>`;
      return;
    }

    const key = this._selectedKey;

    if (key.type === MAP_KEY_TYPES.regular) {
      const tierDef = getTierDef(key.tier);
      const loc = key.locationId ? getLocationById(key.locationId) : null;
      const modifiers = key.locationAct ? getActModifiers(key.locationAct) : [];
      const modsHtml = modifiers.length > 0
        ? `<div class="md-slot__mods">${modifiers.map(m =>
            `<span class="md-slot__mod md-slot__mod--${m.type}" title="${m.name}: ${m.description}">${m.icon} ${m.name}</span>`
          ).join("")}</div>`
        : "";
      this._slotEl.innerHTML = `
        <div class="md-slot__filled md-slot__filled--${key.quality}">
          <div class="md-slot__icon">\uD83D\uDDFA\uFE0F</div>
          <div class="md-slot__name">${key.name}</div>
          <div class="md-slot__desc">${loc ? loc.description : ""}</div>
          <div class="md-slot__tier">${tierDef.name}</div>
          ${modsHtml}
        </div>
        <div id="md-direction-area"></div>
      `;
      this._renderDirectionPicker();
    } else {
      const bossDef = getBossDef(key.bossId);
      const bkt = getBossKeyTierDef(key.bossKeyTier || 1);
      this._slotEl.innerHTML = `
        <div class="md-slot__filled md-slot__filled--${key.quality || "boss_silver"}">
          <div class="md-slot__icon">${bossDef ? bossDef.icon : "\uD83D\uDC80"}</div>
          <div class="md-slot__name">${bossDef ? bossDef.name : key.name}</div>
          <div class="md-slot__tier">${bkt.name}</div>
          <div class="md-slot__desc">${bossDef ? bossDef.description : ""}</div>
        </div>
      `;
    }
  }

  /* ── Direction picker (8 bosses) ─────────────────────────── */

  _renderDirectionPicker() {
    const area = this._slotEl.querySelector("#md-direction-area");
    if (!area) return;

    area.innerHTML = `
      <div class="md-direction-picker">
        <div class="md-direction-picker__title">Choose Direction</div>
        <div class="md-direction-picker__grid">
          ${BOSS_MAPS.map(boss => {
            const selected = this._selectedDirection === boss.id;
            return `
              <div class="md-direction-card${selected ? " md-direction-card--selected" : ""}"
                   data-direction="${boss.id}">
                <span class="md-direction-card__icon">${boss.icon}</span>
                <span class="md-direction-card__name">${boss.bossType}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  /**
   * Toggle selected class on direction cards without full re-render.
   * @param {HTMLElement} newCard — the newly clicked card
   */
  _updateDirectionSelection(newCard) {
    const prev = this._slotEl.querySelector(".md-direction-card--selected");
    if (prev) prev.classList.remove("md-direction-card--selected");
    newCard.classList.add("md-direction-card--selected");
  }

  /* ── Activate button ─────────────────────────────────────── */

  _updateActivateBtn() {
    if (!this._activateBtn) return;

    let canActivate = !!this._selectedKey;

    // Regular keys require a direction to be selected
    if (canActivate && this._selectedKey.type === MAP_KEY_TYPES.regular) {
      canActivate = !!this._selectedDirection;
    }

    this._activateBtn.disabled = !canActivate;
    this._activateBtn.classList.toggle("map-device__activate-btn--disabled", !canActivate);
  }

  _activateMap() {
    if (!this._selectedKey) return;

    const key = this._selectedKey;

    // Consume the key from bag
    this.state.removeMapKeyFromBag(key.id);

    if (key.type === MAP_KEY_TYPES.boss) {
      const bossDef = getBossDef(key.bossId);
      const bkt = getBossKeyTierDef(key.bossKeyTier || 1);
      const waves = getBossMapWaves(key.bossId);
      this.sceneManager.switchTo("combat", {
        mapConfig: {
          isBoss: true,
          bossId: key.bossId,
          bossDef,
          bossKeyTier: key.bossKeyTier || 1,
          bossKeyTierDef: bkt,
          waves,
          tier: 10,
          direction: key.bossId,
        },
      });
    } else {
      const tierDef = getTierDef(key.tier);
      const waves = getWavesForTier(key.tier);
      this.sceneManager.switchTo("combat", {
        mapConfig: {
          isBoss: false,
          tier: key.tier,
          tierDef,
          waves,
          direction: this._selectedDirection,
          locationId: key.locationId || null,
          locationAct: key.locationAct || null,
        },
      });
    }
  }

  unmount() {
    this.container.innerHTML = "";
    this._selectedKey = null;
    this._selectedDirection = null;
    this._keysEl = null;
    this._slotEl = null;
    this._activateBtn = null;
  }
}
