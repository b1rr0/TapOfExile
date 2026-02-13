/**
 * Equipment — fullscreen overlay panel with equipment slots.
 *
 * Pure CSS layout (no background image). Optimised for mobile (portrait).
 * Opens/closes with a toggle button visible on the battle scene.
 *
 * Slot layout (mobile-friendly grid, armor spans 2 rows):
 *  Row 1:  Left Hand |  Head    | Right Hand
 *  Row 2:  (empty)   |  Armor   | Amulet
 *  Row 3:  Ring      |  Armor   | Ring
 *  Row 4:  Gloves    |  Belt    | Boots
 *  Row 5:  Pot Q | Pot E
 */

import type { GameData } from "../types.js";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface GoldChangedData {
  gold: number;
}

export class Equipment {
  container: HTMLElement;
  events: EventBus;
  isOpen: boolean;
  _el: HTMLElement | null;
  _toggleBtn: HTMLButtonElement | null;
  _goldEl: HTMLElement | null;
  _onGoldChanged: ((data: GoldChangedData) => void) | null;
  _onStateLoaded: ((state: GameData) => void) | null;

  /**
   * @param container — #app or game screen element
   * @param events — EventBus
   */
  constructor(container: HTMLElement, events: EventBus) {
    this.container = container;
    this.events = events;
    this.isOpen = false;
    this._el = null;
    this._toggleBtn = null;
    this._goldEl = null;
    this._onGoldChanged = null;
    this._onStateLoaded = null;

    this._createToggleButton();
    this._createPanel();
  }

  /** Create the equipment open button (visible during gameplay). */
  _createToggleButton(): void {
    this._toggleBtn = document.createElement("button");
    this._toggleBtn.className = "equipment-toggle-btn";
    this._toggleBtn.innerHTML = `<img class="equipment-toggle-icon" src="/assets/ui/icons/equipment.svg" alt="Equipment">`;
    this._toggleBtn.title = "Equipment";
    this._toggleBtn.addEventListener("click", () => this.toggle());

    // Place inside battle-scene so it sits in the battle area (not over HUD)
    const battleScene = this.container.querySelector("#battle-scene") ||
                        this.container.querySelector("#game-screen");
    if (battleScene) {
      battleScene.appendChild(this._toggleBtn);
    }
  }

  /** Create the fullscreen equipment overlay panel (pure CSS). */
  _createPanel(): void {
    this._el = document.createElement("div");
    this._el.className = "equipment-overlay hidden";
    this._el.id = "equipment-overlay";

    this._el.innerHTML = `
      <div class="equipment-panel">
        <button class="equipment-close-btn" id="equipment-close">&times;</button>

        <!-- Gold (only visible in equipment) -->
        <div class="equipment-gold-row">
          <span class="equipment-gold__icon">&#9789;</span>
          <span class="equipment-gold__value" id="equipment-gold">0</span>
        </div>

        <h2 class="equipment-title">Equipment</h2>

        <!-- Equipment grid (3 cols × 4 rows, armor spans rows 2-3) -->
        <div class="inv-grid">

          <!-- Row 1: left hand, head, right hand -->
          <div class="inv-slot inv-slot--weapon" data-slot="weapon-left">
            <div class="inv-slot__icon">&#x2694;</div>
            <span class="inv-slot__label">Left Hand</span>
          </div>
          <div class="inv-slot inv-slot--head" data-slot="head">
            <div class="inv-slot__icon">&#x1FA96;</div>
            <span class="inv-slot__label">Helmet</span>
          </div>
          <div class="inv-slot inv-slot--weapon" data-slot="weapon-right">
            <div class="inv-slot__icon">&#x1F6E1;</div>
            <span class="inv-slot__label">Right Hand</span>
          </div>

          <!-- Row 2-3 col 1: empty (invisible) -->
          <div class="inv-slot inv-slot--empty"></div>

          <!-- Row 2-3 col 2: armor (spans 2 rows) -->
          <div class="inv-slot inv-slot--chest" data-slot="chest">
            <div class="inv-slot__icon">&#x1F455;</div>
            <span class="inv-slot__label">Armor</span>
          </div>

          <!-- Row 2 col 3: amulet -->
          <div class="inv-slot inv-slot--acc" data-slot="accessory-2">
            <div class="inv-slot__icon">&#x1F4FF;</div>
            <span class="inv-slot__label">Amulet</span>
          </div>

          <!-- Row 3 col 1: ring -->
          <div class="inv-slot inv-slot--acc" data-slot="accessory-1">
            <div class="inv-slot__icon">&#x1F48D;</div>
            <span class="inv-slot__label">Ring</span>
          </div>

          <!-- Row 3 col 3: ring (armor still occupies col 2) -->
          <div class="inv-slot inv-slot--acc" data-slot="accessory-3">
            <div class="inv-slot__icon">&#x1F48D;</div>
            <span class="inv-slot__label">Ring</span>
          </div>

          <!-- Row 4: gloves, belt, boots -->
          <div class="inv-slot inv-slot--misc" data-slot="gloves">
            <div class="inv-slot__icon">&#x1F9E4;</div>
            <span class="inv-slot__label">Gloves</span>
          </div>
          <div class="inv-slot inv-slot--misc" data-slot="belt">
            <div class="inv-slot__icon">&#x1F517;</div>
            <span class="inv-slot__label">Belt</span>
          </div>
          <div class="inv-slot inv-slot--misc" data-slot="boots">
            <div class="inv-slot__icon">&#x1F462;</div>
            <span class="inv-slot__label">Boots</span>
          </div>
        </div>

        <!-- Consumables row (separate, bottom — 2 slots) -->
        <div class="inv-consumables">
          <div class="inv-slot inv-slot--potion" data-slot="consumable-1">
            <div class="inv-slot__icon">&#x1F9EA;</div>
            <span class="inv-slot__label">Q</span>
          </div>
          <div class="inv-slot inv-slot--potion" data-slot="consumable-2">
            <div class="inv-slot__icon">&#x1F9EA;</div>
            <span class="inv-slot__label">E</span>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this._el);

    // Gold display ref
    this._goldEl = this._el.querySelector("#equipment-gold");

    // Listen for gold changes
    this._onGoldChanged = (data: GoldChangedData): void => {
      if (this._goldEl) this._goldEl.textContent = String(data.gold);
    };
    this.events.on("goldChanged", this._onGoldChanged);

    // Sync initial gold when state is loaded
    this._onStateLoaded = (state: GameData): void => {
      if (this._goldEl && state.player) this._goldEl.textContent = String(state.player.gold);
    };
    this.events.on("stateLoaded", this._onStateLoaded);

    // Close button
    this._el.querySelector("#equipment-close")!.addEventListener("click", () => {
      this.close();
    });

    // Close on backdrop click
    this._el.addEventListener("click", (e: MouseEvent) => {
      if (e.target === this._el) this.close();
    });
  }

  /** Toggle open/close. */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Open the equipment panel (slide up). */
  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this._el!.classList.remove("hidden", "equipment-closing");
    void this._el!.offsetHeight;
    this._el!.classList.add("equipment-visible");

    this.events.emit("equipmentOpened");
  }

  /** Close the equipment panel (slide down, then hide). */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    this._el!.classList.remove("equipment-visible");
    this._el!.classList.add("equipment-closing");

    const onDone = (): void => {
      this._el!.removeEventListener("transitionend", onDone);
      this._el!.classList.remove("equipment-closing");
      this._el!.classList.add("hidden");
    };
    this._el!.addEventListener("transitionend", onDone);

    this.events.emit("equipmentClosed");
  }

  destroy(): void {
    if (this._onGoldChanged) this.events.off("goldChanged", this._onGoldChanged);
    if (this._onStateLoaded) this.events.off("stateLoaded", this._onStateLoaded);
    if (this._el) this._el.remove();
    if (this._toggleBtn) this._toggleBtn.remove();
  }
}
