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
import { STAT_DEFS, SUBTYPES, UI_SLOT_ACCEPTS } from "@shared/equipment-defs";
import type { StatId, EquipmentSlotId } from "@shared/equipment-defs";
import { getLore } from "@shared/equipment-lore";
import type { BagItem } from "../types.js";

const POTION_LORE: Record<string, string> = {
  small_vial: 'Concentrated to the point where a single drop can mend a sword-wound, these vials are the assassin\'s friend — small enough to hide in a sleeve, potent enough to cheat death.',
  round_flask: 'Brewed in the cellars of wandering alchemists, this flask holds a crimson draught that knits torn flesh and mends shattered bone. The warmth it brings is fleeting, but in battle, a heartbeat is all one needs.',
  corked_flask: 'Sealed with wax etched in forgotten sigils, the cork holds back more than liquid — it restrains a living remedy that yearns to mend. Those who drink speak of fire rushing through their veins, burning away pain and weakness alike.',
  tall_bottle: 'Forged in the crucibles of the Order of the Crimson Eye, this slender vessel carries a distillation of life itself. Each sip restores what the battlefield takes, though the alchemists warn: the body remembers every debt.',
  wide_bottle: 'A vessel of war, broad-shouldered and built to endure the chaos of battle. The draught within pulses with a deep scarlet glow, as if the blood of the earth itself has been captured and made to serve mortal need.',
  jug: 'An ancient vessel passed down through generations of warriors. Its contents swirl with a depth that defies its humble appearance — a single draught can pull a dying soul back from the brink, though the price is whispered to be paid in years, not coin.',
};

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
  refreshState(): Promise<void>;
}

export class Equipment {
  container: HTMLElement;
  events: EventBus;
  state: GameState;
  isOpen: boolean;
  _el: HTMLElement | null;
  _toggleBtn: HTMLButtonElement | null;
  _goldEl: HTMLElement | null;
  _levelEl: HTMLElement | null;
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
    this._levelEl = null;
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

        <!-- Info bar: level + gold -->
        <div class="equipment-info-row">
          <div class="equipment-info-item">
            <span class="equipment-info__label">Lv</span>
            <span class="equipment-info__value" id="equipment-level">1</span>
          </div>
          <div class="equipment-info-item">
            <span class="equipment-info__icon">&#x1FA99;</span>
            <span class="equipment-info__value" id="equipment-gold">0</span>
          </div>
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

    // Info bar refs
    this._goldEl = this._el.querySelector("#equipment-gold");
    this._levelEl = this._el.querySelector("#equipment-level");
    this._potionModalEl = this._el.querySelector("#equip-potion-modal");

    // Listen for gold changes
    this._onGoldChanged = (data: GoldChangedData): void => {
      if (this._goldEl) this._goldEl.textContent = String(data.gold);
    };
    this.events.on("goldChanged", this._onGoldChanged);

    // Sync initial gold + level + potion slots when state is loaded
    this._onStateLoaded = (state: GameData): void => {
      if (this._goldEl && state.player) this._goldEl.textContent = String(state.player.gold);
      if (this._levelEl) {
        const chars = state.characters || [];
        const active = state.activeCharacterId ? chars.find((c: any) => c.id === state.activeCharacterId) : null;
        if (active) this._levelEl.textContent = String(active.level || 1);
      }
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

    // Gear slot click handlers (inv-grid, not consumables)
    const invGrid = this._el.querySelector(".inv-grid");
    if (invGrid) {
      invGrid.addEventListener("click", (e: Event) => {
        const slotEl = (e.target as HTMLElement).closest("[data-slot]") as HTMLElement | null;
        if (!slotEl) return;
        const slotId = slotEl.dataset.slot;
        if (!slotId) return;
        this._onGearSlotClick(slotId);
      });
    }
  }

  /** Handle click on a potion slot in equipment panel. */
  _onPotionSlotClick(slotId: string): void {
    const potionData = this._equipment[slotId];
    if (!potionData || !potionData.flaskType) {
      // Empty slot — show equippable potions from bag
      this._showPotionPicker(slotId);
      return;
    }

    // Filled slot — show potion info + unequip/change buttons
    const q = QUALITY_COLORS[potionData.quality] || QUALITY_COLORS.common;
    const healPct = Math.round((potionData.healPercent || 0) * 100);
    const charges = potionData.currentCharges || 0;
    const maxCharges = potionData.maxCharges || 0;
    const spriteIdx = Math.min(Math.max(charges, 1), 5);

    const potionLore = POTION_LORE[potionData.flaskType] || '';
    const potionLoreHtml = potionLore
      ? `<div class="equip-potion-modal__lore">${potionLore}</div>`
      : '';

    this._showPotionModal(`
      <div class="equip-potion-modal__sprite">
        <img src="/assets/equipments/consumables/${potionData.flaskType}s/red_${spriteIdx}.png"
             style="width:62px;height:62px;image-rendering:pixelated">
      </div>
      <div class="equip-potion-modal__name" style="color:${q.color}">${potionData.name || potionData.flaskType}</div>
      <div class="equip-potion-modal__quality" style="color:${q.color}">${q.label}</div>
      <div class="equip-potion-modal__stat">Heal: ${healPct}% HP</div>
      <div class="equip-potion-modal__stat">Charges: ${charges}/${maxCharges}</div>
      <div class="equip-potion-modal__actions-row">
        <button class="equip-potion-modal__unequip-btn" data-slot="${slotId}">Unequip</button>
        <button class="equip-potion-modal__change-btn" data-slot="${slotId}">Change</button>
      </div>
      <button class="equip-potion-modal__close-btn">Close</button>
      ${potionLoreHtml}
    `);

    // Wire unequip button
    const unequipBtn = this._potionModalEl!.querySelector(".equip-potion-modal__unequip-btn");
    if (unequipBtn) {
      unequipBtn.addEventListener("click", async () => {
        try {
          await loot.unequipPotion(slotId);
          this._hidePotionModal();
          await this.state.refreshState();
          this._renderPotionSlots(this.state.data!);
          this.events.emit("equipmentChanged");
        } catch (err) {
          console.error("[Equipment] Unequip failed:", err);
        }
      });
    }

    // Wire change button
    const changeBtn = this._potionModalEl!.querySelector(".equip-potion-modal__change-btn");
    if (changeBtn) {
      changeBtn.addEventListener("click", () => {
        this._showPotionPicker(slotId);
      });
    }
  }

  /** Show a list of potions from bag that can be equipped in the given slot. */
  _showPotionPicker(slotId: string): void {
    const bag: BagItem[] = (this.state as any).bag || [];
    const potions = bag.filter((item: BagItem) => item.type === 'potion');
    const slotKey = slotId === 'consumable-1' ? 'Q' : 'E';

    if (potions.length === 0) {
      this._showPotionModal(`
        <div class="equip-potion-modal__hint">No potions in bag</div>
        <button class="equip-potion-modal__close-btn">OK</button>
      `);
      return;
    }

    // Sort: by quality (legendary > epic > rare > common), then heal % desc
    const qualityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    potions.sort((a, b) => {
      const qa = qualityOrder[a.quality] ?? 4;
      const qb = qualityOrder[b.quality] ?? 4;
      if (qa !== qb) return qa - qb;
      return (b.healPercent || 0) - (a.healPercent || 0);
    });

    const listHtml = potions.map((item) => {
      const q = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;
      const healPct = Math.round((item.healPercent || 0) * 100);
      const maxCh = item.maxCharges || 0;
      const spriteIdx = Math.min(Math.max(item.currentCharges || item.maxCharges || 1, 1), 5);

      return `
        <div class="equip-picker__item" data-item-id="${item.id}">
          <div class="equip-picker__icon">
            <img src="/assets/equipments/consumables/${item.flaskType}s/red_${spriteIdx}.png" style="width:42px;height:42px;image-rendering:pixelated">
          </div>
          <div class="equip-picker__info">
            <div class="equip-picker__name" style="color:${q.color}">${item.name || item.flaskType}</div>
            <div class="equip-picker__meta">
              <span style="color:${q.color}">${q.label}</span>
              · Heal ${healPct}% · ${maxCh} charges
            </div>
          </div>
        </div>
      `;
    }).join('');

    this._showPotionModal(`
      <div class="equip-picker__title">Equip Potion → ${slotKey}</div>
      <div class="equip-picker__list">${listHtml}</div>
      <button class="equip-potion-modal__close-btn">Close</button>
    `);

    // Wire item clicks
    const listEl = this._potionModalEl!.querySelector('.equip-picker__list');
    if (listEl) {
      listEl.addEventListener('click', async (e: Event) => {
        const itemEl = (e.target as HTMLElement).closest('.equip-picker__item') as HTMLElement | null;
        if (!itemEl || itemEl.classList.contains('equip-picker__item--disabled')) return;
        const itemId = itemEl.dataset.itemId;
        if (!itemId) return;

        listEl.querySelectorAll('.equip-picker__item').forEach(el => el.classList.add('equip-picker__item--disabled'));

        try {
          await loot.equipPotion(itemId, slotId);
          this._hidePotionModal();
          await this.state.refreshState();
          this._renderPotionSlots(this.state.data!);
          this.events.emit("equipmentChanged");
        } catch (err: any) {
          console.error("[Equipment] Equip potion from picker failed:", err);
          listEl.querySelectorAll('.equip-picker__item').forEach(el => el.classList.remove('equip-picker__item--disabled'));
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
    const char = this._getActiveCharacter();
    if (this._levelEl && char) {
      this._levelEl.textContent = String(char.level || 1);
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

  /** Handle click on a gear slot in the equipment grid. */
  _onGearSlotClick(slotId: string): void {
    const gearData = this._equipment[slotId];
    if (!gearData || gearData.type !== 'equipment') {
      // Empty slot — show equippable items from bag
      this._showEquipPicker(slotId);
      return;
    }

    // Filled slot — show gear info + unequip/change buttons
    const q = QUALITY_COLORS[gearData.quality] || QUALITY_COLORS.common;
    const props = gearData.properties || {};
    const sub = SUBTYPES.find(s => s.code === props.subtype);
    const subtypeName = sub?.name || props.subtype || '';

    let statsHtml = '';

    // Base damage (weapons)
    if (props.baseDamage) {
      statsHtml += `<div class="equip-potion-modal__stat">Base Damage: ${props.baseDamage}</div>`;
    }
    // Base defenses
    if (props.baseArmor) {
      statsHtml += `<div class="equip-potion-modal__stat">Base Armour: ${props.baseArmor}</div>`;
    }
    if (props.baseEvasion) {
      statsHtml += `<div class="equip-potion-modal__stat">Base Evasion: ${props.baseEvasion}</div>`;
    }
    if (props.baseES) {
      statsHtml += `<div class="equip-potion-modal__stat">Base ES: ${props.baseES}</div>`;
    }

    // Implicit
    if (props.implicit) {
      const implDef = STAT_DEFS[props.implicit.id as StatId];
      const implName = implDef?.name || props.implicit.id;
      const implUnit = implDef?.unit === '+N%' ? '%' : '';
      statsHtml += `<div class="equip-potion-modal__stat" style="color:#b0a060">Implicit: +${props.implicit.value}${implUnit} ${implName}</div>`;
    }

    // Separator
    if (props.stats?.length) {
      statsHtml += `<div style="border-top:1px solid rgba(255,255,255,0.1);margin:6px 0"></div>`;
    }

    // Rolled stats
    for (const stat of props.stats || []) {
      const def = STAT_DEFS[stat.id as StatId];
      const name = def?.name || stat.id;
      const unit = def?.unit === '+N%' ? '%' : def?.unit === '+N/s' ? '/s' : '';
      statsHtml += `<div class="equip-potion-modal__stat">+${stat.value}${unit} ${name}</div>`;
    }

    // Req level
    const reqLvl = props.reqLevel || 0;
    statsHtml += `<div class="equip-potion-modal__stat" style="color:#888;font-size:11px;margin-top:4px">Required Level: ${reqLvl}</div>`;

    // Lore from catalog
    const loreText = gearData.icon ? getLore(gearData.icon) : undefined;
    const loreHtml = loreText
      ? `<div class="equip-potion-modal__lore">${loreText}</div>`
      : '';

    const iconHtml = gearData.icon
      ? `<div class="equip-potion-modal__sprite"><img src="${gearData.icon}" style="width:96px;height:96px;image-rendering:pixelated"></div>`
      : '';

    this._showPotionModal(`
      ${iconHtml}
      <div class="equip-potion-modal__name" style="color:${q.color}">${gearData.name || 'Unknown'}</div>
      <div class="equip-potion-modal__quality" style="color:${q.color}">${q.label} ${subtypeName}</div>
      ${statsHtml}
      <div class="equip-potion-modal__actions-row">
        <button class="equip-potion-modal__unequip-btn" data-slot="${slotId}">Unequip</button>
        <button class="equip-potion-modal__change-btn" data-slot="${slotId}">Change</button>
      </div>
      <button class="equip-potion-modal__close-btn">Close</button>
      ${loreHtml}
    `);

    // Wire unequip button
    const unequipBtn = this._potionModalEl!.querySelector(".equip-potion-modal__unequip-btn");
    if (unequipBtn) {
      unequipBtn.addEventListener("click", async () => {
        try {
          await loot.unequipItem(slotId);
          this._hidePotionModal();
          await this.state.refreshState();
          this._renderPotionSlots(this.state.data!);
          this.events.emit("equipmentChanged");
        } catch (err) {
          console.error("[Equipment] Unequip gear failed:", err);
        }
      });
    }

    // Wire change button
    const changeBtn = this._potionModalEl!.querySelector(".equip-potion-modal__change-btn");
    if (changeBtn) {
      changeBtn.addEventListener("click", () => {
        this._showEquipPicker(slotId);
      });
    }
  }

  /** Show a list of equippable bag items for the given UI slot. */
  _showEquipPicker(slotId: string): void {
    const accepts = UI_SLOT_ACCEPTS[slotId];
    if (!accepts) return;

    const bag: BagItem[] = (this.state as any).bag || [];
    const char = this._getActiveCharacter();
    const charLevel = char?.level || 0;

    // Filter bag items: equipment type, matching slot, in bag
    const matching = bag.filter((item: BagItem) => {
      if (item.type !== 'equipment') return false;
      const itemSlot = item.properties?.slot as EquipmentSlotId | undefined;
      return itemSlot ? accepts.includes(itemSlot) : false;
    });

    const SLOT_LABELS: Record<string, string> = {
      'weapon-left': 'Left Hand', 'weapon-right': 'Right Hand',
      'head': 'Helmet', 'chest': 'Armor',
      'accessory-1': 'Ring', 'accessory-2': 'Amulet', 'accessory-3': 'Ring',
      'gloves': 'Gloves', 'belt': 'Belt', 'boots': 'Boots',
    };
    const slotLabel = SLOT_LABELS[slotId] || slotId;

    if (matching.length === 0) {
      this._showPotionModal(`
        <div class="equip-potion-modal__hint">No ${slotLabel} items in bag</div>
        <button class="equip-potion-modal__close-btn">OK</button>
      `);
      return;
    }

    // Sort: by quality (legendary > epic > rare > common), then by item level desc
    const qualityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
    matching.sort((a, b) => {
      const qa = qualityOrder[a.quality] ?? 4;
      const qb = qualityOrder[b.quality] ?? 4;
      if (qa !== qb) return qa - qb;
      return (b.properties?.itemLevel || 0) - (a.properties?.itemLevel || 0);
    });

    const listHtml = matching.map((item) => {
      const q = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;
      const props = item.properties || {};
      const sub = SUBTYPES.find(s => s.code === props.subtype);
      const reqLvl = props.reqLevel || 0;
      const canEquip = charLevel >= reqLvl;
      const disabledCls = canEquip ? '' : 'equip-picker__item--disabled';

      // Brief stat summary (first 2 stats)
      const briefStats = (props.stats || []).slice(0, 2).map((s: any) => {
        const def = STAT_DEFS[s.id as StatId];
        const unit = def?.unit === '+N%' ? '%' : def?.unit === '+N/s' ? '/s' : '';
        return `+${s.value}${unit} ${def?.name || s.id}`;
      }).join(', ');

      return `
        <div class="equip-picker__item ${disabledCls}" data-item-id="${item.id}">
          <div class="equip-picker__icon">
            ${item.icon ? `<img src="${item.icon}" style="width:64px;height:64px;image-rendering:pixelated">` : '?'}
          </div>
          <div class="equip-picker__info">
            <div class="equip-picker__name" style="color:${q.color}">${item.name}</div>
            <div class="equip-picker__meta">
              <span style="color:${q.color}">${q.label}</span>
              ${sub ? ` ${sub.name}` : ''}
              ${props.itemLevel ? ` · iLvl ${props.itemLevel}` : ''}
            </div>
            ${briefStats ? `<div class="equip-picker__stats">${briefStats}</div>` : ''}
            ${!canEquip ? `<div class="equip-picker__warn">Requires Lv.${reqLvl}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    this._showPotionModal(`
      <div class="equip-picker__title">Equip → ${slotLabel}</div>
      <div class="equip-picker__list">${listHtml}</div>
      <button class="equip-potion-modal__close-btn">Close</button>
    `);

    // Wire item clicks
    const listEl = this._potionModalEl!.querySelector('.equip-picker__list');
    if (listEl) {
      listEl.addEventListener('click', async (e: Event) => {
        const itemEl = (e.target as HTMLElement).closest('.equip-picker__item') as HTMLElement | null;
        if (!itemEl || itemEl.classList.contains('equip-picker__item--disabled')) return;
        const itemId = itemEl.dataset.itemId;
        if (!itemId) return;

        // Disable all items during equip
        listEl.querySelectorAll('.equip-picker__item').forEach(el => el.classList.add('equip-picker__item--disabled'));

        try {
          await loot.equipItem(itemId, slotId);
          this._hidePotionModal();
          await this.state.refreshState();
          this._renderPotionSlots(this.state.data!);
          this.events.emit("equipmentChanged");
        } catch (err: any) {
          console.error("[Equipment] Equip from picker failed:", err);
          // Re-enable items
          listEl.querySelectorAll('.equip-picker__item').forEach(el => el.classList.remove('equip-picker__item--disabled'));
        }
      });
    }
  }

  /** Get active character from state. */
  _getActiveCharacter(): any | null {
    const chars = this.state.data?.characters || [];
    const activeId = this.state.data?.activeCharacterId;
    return activeId ? chars.find((c: any) => c.id === activeId) : null;
  }

  /** Render all equipped items in slots (potions + gear). */
  _renderPotionSlots(state: GameData): void {
    if (!this._el) return;

    // Find active character's equipment
    const chars = state.characters || [];
    const activeId = state.activeCharacterId;
    const active = activeId ? chars.find((c: any) => c.id === activeId) : null;
    const equipment = (active?.inventory?.equipment || {}) as Record<string, any>;
    this._equipment = equipment;

    // Render consumable slots (potions)
    const potionSlots = ['consumable-1', 'consumable-2'] as const;
    for (const slotId of potionSlots) {
      const slotEl = this._el.querySelector(`[data-slot="${slotId}"]`) as HTMLElement | null;
      if (!slotEl) continue;

      const potionData = equipment[slotId];
      const iconEl = slotEl.querySelector('.inv-slot__icon') as HTMLElement | null;
      if (!iconEl) continue;

      if (potionData && potionData.flaskType) {
        const charges = potionData.currentCharges || 0;
        const maxCharges = potionData.maxCharges || 0;
        const spriteIdx = Math.min(Math.max(charges, 1), 5);
        iconEl.innerHTML = `<img src="/assets/equipments/consumables/${potionData.flaskType}s/red_${spriteIdx}.png" style="width:42px;height:42px;image-rendering:pixelated">`;
        const labelEl = slotEl.querySelector('.inv-slot__label') as HTMLElement | null;
        if (labelEl) labelEl.style.display = 'none';
        slotEl.classList.remove("inv-slot--potion-empty");
      } else {
        iconEl.innerHTML = "&#x1F9EA;";
        const labelEl = slotEl.querySelector('.inv-slot__label') as HTMLElement | null;
        if (labelEl) {
          labelEl.textContent = slotId === 'consumable-1' ? 'Q' : 'E';
          labelEl.style.display = '';
        }
        slotEl.classList.add("inv-slot--potion-empty");
      }
    }

    // Render gear slots
    const gearSlots = [
      'weapon-left', 'weapon-right', 'head', 'chest',
      'accessory-1', 'accessory-2', 'accessory-3',
      'gloves', 'belt', 'boots',
    ];
    for (const slotId of gearSlots) {
      const slotEl = this._el.querySelector(`[data-slot="${slotId}"]`) as HTMLElement | null;
      if (!slotEl) continue;

      const gearData = equipment[slotId];
      const iconEl = slotEl.querySelector('.inv-slot__icon') as HTMLElement | null;
      const labelEl = slotEl.querySelector('.inv-slot__label') as HTMLElement | null;

      if (gearData && gearData.type === 'equipment') {
        const q = QUALITY_COLORS[gearData.quality] || QUALITY_COLORS.common;
        slotEl.style.borderColor = q.color;
        slotEl.classList.add('inv-slot--filled');
        if (iconEl && gearData.icon) {
          const imgSize = slotId === 'chest' ? 109 : 72;
          iconEl.innerHTML = `<img src="${gearData.icon}" style="width:${imgSize}px;height:${imgSize}px;image-rendering:pixelated">`;
        }
        // Hide label when item is equipped — let the image fill the slot
        if (labelEl) {
          labelEl.style.display = 'none';
        }
      } else {
        slotEl.style.borderColor = '';
        slotEl.classList.remove('inv-slot--filled');
        // Restore default icon
        if (iconEl) {
          const defaultIcons: Record<string, string> = {
            'weapon-left': '&#x2694;',
            'weapon-right': '&#x1F6E1;',
            'head': '&#x1FA96;',
            'chest': '&#x1F455;',
            'accessory-1': '&#x1F48D;',
            'accessory-2': '&#x1F4FF;',
            'accessory-3': '&#x1F48D;',
            'gloves': '&#x1F9E4;',
            'belt': '&#x1F517;',
            'boots': '&#x1F462;',
          };
          iconEl.innerHTML = defaultIcons[slotId] || '?';
        }
        if (labelEl) {
          const defaultLabels: Record<string, string> = {
            'weapon-left': 'Left Hand',
            'weapon-right': 'Right Hand',
            'head': 'Helmet',
            'chest': 'Armor',
            'accessory-1': 'Ring',
            'accessory-2': 'Amulet',
            'accessory-3': 'Ring',
            'gloves': 'Gloves',
            'belt': 'Belt',
            'boots': 'Boots',
          };
          labelEl.textContent = defaultLabels[slotId] || slotId;
          labelEl.style.color = '';
          labelEl.style.display = '';
        }
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
