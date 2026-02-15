/**
 * Equipment — fullscreen overlay panel with equipment slots.
 *
 * Pure CSS layout (no background image). Optimised for mobile (portrait).
 * Opens/closes with a toggle button visible on the battle scene.
 *
 * Potion slots are interactive:
 * - Clicking a filled slot opens a mini-modal with info + "Unequip" button.
 * - Clicking an empty slot shows a hint.
 *
 * Slot layout (mobile-friendly grid, armor spans 2 rows):
 *  Row 1:  Left Hand |  Head    | Right Hand
 *  Row 2:  (empty)   |  Armor   | Amulet
 *  Row 3:  Ring      |  Armor   | Ring
 *  Row 4:  Gloves    |  Belt    | Boots
 *  Row 5:  Pot Q | Pot E
 */

import type { GameData } from "../types.js";
import { loot } from "../api.js";
import { QUALITY_COLORS } from "./item-tooltip.js";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface GoldChangedData {
  gold: number;
}

interface GameState {
  data: GameData;
}

export class Equipment {
  container: HTMLElement;
  events: EventBus;
  state: GameState;
  isOpen: boolean;
  _el: HTMLElement | null;
  _toggleBtn: HTMLButtonElement | null;
  _goldEl: HTMLElement | null;
  _potionModalEl: HTMLElement | null;
  _onGoldChanged: ((data: GoldChangedData) => void) | null;
  _onStateLoaded: ((state: GameData) => void) | null;
  /** Cached equipment data for slot clicks */
  _equipment: Record<string, any>;

  /**
   * @param container — #app or game screen element
   * @param events — EventBus
   * @param state — GameState for initial render
   */
  constructor(container: HTMLElement, events: EventBus, state: GameState) {
    this.container = container;
    this.events = events;
    this.state = state;
    this.isOpen = false;
    this._el = null;
    this._toggleBtn = null;
    this._goldEl = null;
    this._potionModalEl = null;
    this._onGoldChanged = null;
    this._onStateLoaded = null;
    this._equipment = {};

    this._createToggleButton();
    this._createPanel();

    // Render immediately from current state (stateLoaded may have already fired)
    this._renderPotionSlots(this.state.data);
    if (this._goldEl && this.state.data.player) {
      (this._goldEl as HTMLElement).textContent = String(this.state.data.player.gold);
    }
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

        <!-- Equipment grid (3 cols x 4 rows, armor spans rows 2-3) -->
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

        <!-- Potion slot mini-modal -->
        <div class="equip-potion-modal hidden" id="equip-potion-modal">
          <div class="equip-potion-modal__content" id="equip-potion-modal-content"></div>
        </div>
      </div>
    `;

    this.container.appendChild(this._el);

    // Gold display ref
    this._goldEl = this._el.querySelector("#equipment-gold");
    this._potionModalEl = this._el.querySelector("#equip-potion-modal");

    // Listen for gold changes
    this._onGoldChanged = (data: GoldChangedData): void => {
      if (this._goldEl) this._goldEl.textContent = String(data.gold);
    };
    this.events.on("goldChanged", this._onGoldChanged);

    // Sync initial gold + potion slots when state is loaded
    this._onStateLoaded = (state: GameData): void => {
      if (this._goldEl && state.player) this._goldEl.textContent = String(state.player.gold);
      this._renderPotionSlots(state);
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

    // Potion slot click handlers
    const consumablesRow = this._el.querySelector(".inv-consumables");
    if (consumablesRow) {
      consumablesRow.addEventListener("click", (e: Event) => {
        const slotEl = (e.target as HTMLElement).closest(".inv-slot--potion") as HTMLElement | null;
        if (!slotEl) return;
        const slotId = slotEl.dataset.slot;
        if (!slotId) return;
        this._onPotionSlotClick(slotId);
      });
    }
  }

  /** Handle click on a potion slot in equipment panel. */
  _onPotionSlotClick(slotId: string): void {
    const potionData = this._equipment[slotId];
    if (!potionData || !potionData.flaskType) {
      // Empty slot — show hint
      this._showPotionModal(`
        <div class="equip-potion-modal__hint">Equip potions from Chest</div>
        <button class="equip-potion-modal__close-btn">OK</button>
      `);
      return;
    }

    // Filled slot — show potion info + unequip button
    const q = QUALITY_COLORS[potionData.quality] || QUALITY_COLORS.common;
    const healPct = Math.round((potionData.healPercent || 0) * 100);
    const charges = potionData.currentCharges || 0;
    const maxCharges = potionData.maxCharges || 0;
    const spriteIdx = Math.min(Math.max(charges, 1), 5);

    this._showPotionModal(`
      <div class="equip-potion-modal__sprite">
        <img src="/assets/potions/${potionData.flaskType}/red_${spriteIdx}.png"
             style="width:48px;height:48px;image-rendering:pixelated">
      </div>
      <div class="equip-potion-modal__name" style="color:${q.color}">${potionData.name || potionData.flaskType}</div>
      <div class="equip-potion-modal__quality" style="color:${q.color}">${q.label}</div>
      <div class="equip-potion-modal__stat">Heal: ${healPct}% HP</div>
      <div class="equip-potion-modal__stat">Charges: ${charges}/${maxCharges}</div>
      <button class="equip-potion-modal__unequip-btn" data-slot="${slotId}">Unequip</button>
      <button class="equip-potion-modal__close-btn">Close</button>
    `);

    // Wire unequip button
    const unequipBtn = this._potionModalEl!.querySelector(".equip-potion-modal__unequip-btn");
    if (unequipBtn) {
      unequipBtn.addEventListener("click", async () => {
        try {
          await loot.unequipPotion(slotId);
          this._hidePotionModal();
          this.events.emit("equipmentChanged");
        } catch (err) {
          console.error("[Equipment] Unequip failed:", err);
        }
      });
    }
  }

  _showPotionModal(html: string): void {
    if (!this._potionModalEl) return;
    const contentEl = this._potionModalEl.querySelector("#equip-potion-modal-content")!;
    contentEl.innerHTML = html;
    this._potionModalEl.classList.remove("hidden");

    // Wire close button
    const closeBtn = contentEl.querySelector(".equip-potion-modal__close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this._hidePotionModal());
    }
  }

  _hidePotionModal(): void {
    if (this._potionModalEl) {
      this._potionModalEl.classList.add("hidden");
    }
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

    // Always re-render from latest state when opening
    this._renderPotionSlots(this.state.data);
    if (this._goldEl && this.state.data.player) {
      this._goldEl.textContent = String(this.state.data.player.gold);
    }

    this._el!.classList.remove("hidden", "equipment-closing");
    void this._el!.offsetHeight;
    this._el!.classList.add("equipment-visible");

    this.events.emit("equipmentOpened");
  }

  /** Close the equipment panel (slide down, then hide). */
  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._hidePotionModal();

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

  /** Render equipped potions in consumable slots. */
  _renderPotionSlots(state: GameData): void {
    if (!this._el) return;

    // Find active character's equipment
    const chars = state.characters || [];
    const activeId = state.activeCharacterId;
    const active = activeId ? chars.find((c: any) => c.id === activeId) : null;
    const equipment = (active?.inventory?.equipment || {}) as Record<string, any>;
    this._equipment = equipment;

    const slots = ['consumable-1', 'consumable-2'] as const;
    for (const slotId of slots) {
      const slotEl = this._el.querySelector(`[data-slot="${slotId}"]`) as HTMLElement | null;
      if (!slotEl) continue;

      const potionData = equipment[slotId];
      const iconEl = slotEl.querySelector('.inv-slot__icon') as HTMLElement | null;
      if (!iconEl) continue;

      if (potionData && potionData.flaskType) {
        const charges = potionData.currentCharges || 0;
        const maxCharges = potionData.maxCharges || 0;
        const spriteIdx = Math.min(Math.max(charges, 1), 5);
        iconEl.innerHTML = `<img src="/assets/potions/${potionData.flaskType}/red_${spriteIdx}.png" style="width:32px;height:32px;image-rendering:pixelated">`;
        const labelEl = slotEl.querySelector('.inv-slot__label') as HTMLElement | null;
        if (labelEl) {
          labelEl.textContent = charges > 0 ? `${charges}/${maxCharges}` : slotId === 'consumable-1' ? 'Q' : 'E';
        }
        slotEl.classList.remove("inv-slot--potion-empty");
      } else {
        // Empty slot — reset to default
        iconEl.innerHTML = "&#x1F9EA;";
        const labelEl = slotEl.querySelector('.inv-slot__label') as HTMLElement | null;
        if (labelEl) {
          labelEl.textContent = slotId === 'consumable-1' ? 'Q' : 'E';
        }
        slotEl.classList.add("inv-slot--potion-empty");
      }
    }
  }

  destroy(): void {
    if (this._onGoldChanged) this.events.off("goldChanged", this._onGoldChanged);
    if (this._onStateLoaded) this.events.off("stateLoaded", this._onStateLoaded);
    if (this._el) this._el.remove();
    if (this._toggleBtn) this._toggleBtn.remove();
  }
}
