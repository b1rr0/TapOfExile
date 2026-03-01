/**
 * ChestPanel — bag overlay with tabs, sorting, long-press tooltip,
 * item detail modal with equip/discard actions.
 *
 * Tabs: "All" + dynamic tabs per item type in bag.
 * Sorting: Quality / Level / Newest (applies within active tab).
 * Long-press (300ms): shows floating ItemTooltip.
 * Tap: opens item detail modal (equip potions, discard, compare).
 */

import type { BagItem, Character } from "../types.js";
import { ItemTooltip, QUALITY_COLORS } from "./item-tooltip.js";
import { loot } from "../api.js";
import { STAT_DEFS, SUBTYPES, getValidUISlots } from "@shared/equipment-defs";
import type { StatId, EquipmentSlotId } from "@shared/equipment-defs";
import { getLore } from "@shared/equipment-lore";

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

interface GameState {
  getActiveCharacter(): {
    bag: BagItem[];
    level: number;
    inventory?: { equipment?: Record<string, any> };
  } | null;
  bag: BagItem[];
  refreshState(): Promise<void>;
}

type SortMode = "quality" | "level" | "newest";
type TabType = "all" | string;

/** Quality tier order for sorting (higher = better). */
const QUALITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Tab display config — equipment broken into individual slot types. */
const TAB_CONFIG: Record<string, { label: string; icon: string }> = {
  all:          { label: "All",       icon: "&#x2B1A;" },
  // Equipment slot tabs
  weapon:       { label: "Weapon",    icon: "&#x2694;" },
  helmet:       { label: "Helmet",    icon: "&#x1FA96;" },
  armor:        { label: "Armor",     icon: "&#x1F6E1;" },
  gloves:       { label: "Gloves",    icon: "&#x1F9E4;" },
  belt:         { label: "Belt",      icon: "&#x1F4BF;" },
  boots:        { label: "Boots",     icon: "&#x1F462;" },
  ring:         { label: "Ring",      icon: "&#x1F48D;" },
  amulet:       { label: "Amulet",    icon: "&#x1F4FF;" },
  // Non-equipment tabs
  potion:       { label: "Potions",   icon: "&#x1F9EA;" },
  map_key:      { label: "Maps",      icon: "&#x1F5FA;" },
  boss_map_key: { label: "Boss",      icon: "&#x1F480;" },
};

/** Map equipment slot to tab key. */
const SLOT_TO_TAB: Record<string, string> = {
  one_hand: "weapon",
  two_hand: "weapon",
  helmet: "helmet",
  armor: "armor",
  gloves: "gloves",
  belt: "belt",
  boots: "boots",
  ring: "ring",
  amulet: "amulet",
};

/** Get the tab key for a bag item. */
function getItemTabKey(item: BagItem): string {
  if (item.type === "equipment" && item.properties?.slot) {
    return SLOT_TO_TAB[item.properties.slot as string] || "weapon";
  }
  return item.type;
}

/** Sell price calculation (mirrors server logic). */
const QUALITY_MUL: Record<string, number> = { common: 1, rare: 3, epic: 8, legendary: 20 };

function calcSellPrice(item: BagItem): number {
  const mul = QUALITY_MUL[item.quality] || 1;
  if (item.type === "equipment") {
    const iLvl = item.properties?.itemLevel || item.level || 1;
    return Math.max(1, Math.floor((iLvl as number) * mul));
  }
  if (item.type === "potion") return Math.max(1, 5 * mul);
  if (item.type === "map_key") return Math.max(1, (item.tier || 1) * 10);
  if (item.type === "boss_map_key") return Math.max(1, (item.bossKeyTier || 1) * 50);
  return 1;
}

const GRID_COLS = 4;
const GRID_ROWS = 8;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

export class ChestPanel {
  container: HTMLElement;
  events: EventBus;
  state: GameState;
  isOpen: boolean;
  _el: HTMLElement | null;
  _sortMode: SortMode;
  _activeTab: TabType;
  _tooltip: ItemTooltip;
  _modalEl: HTMLElement | null;
  /** Filtered+sorted items cached for click lookups */
  _displayedItems: BagItem[];

  constructor(container: HTMLElement, events: EventBus, state: GameState) {
    this.container = container;
    this.events = events;
    this.state = state;
    this.isOpen = false;
    this._el = null;
    this._sortMode = "newest";
    this._activeTab = "all";
    this._tooltip = new ItemTooltip();
    this._modalEl = null;
    this._displayedItems = [];

    this._createPanel();
  }

  /* ── Panel creation ────────────────────────────────────── */

  _createPanel(): void {
    this._el = document.createElement("div");
    this._el.className = "bag-overlay hidden";
    this._el.id = "bag-overlay";

    this._el.innerHTML = `
      <div class="bag-panel">
        <button class="bag-close-btn" id="bag-close">&times;</button>

        <h2 class="bag-title">Chest</h2>

        <!-- Tabs -->
        <div class="bag-tabs" id="bag-tabs"></div>

        <!-- Sort buttons -->
        <div class="bag-sort-row">
          <button class="bag-sort-btn" data-sort="quality">Quality</button>
          <button class="bag-sort-btn" data-sort="level">Level</button>
          <button class="bag-sort-btn bag-sort-btn--active" data-sort="newest">Newest</button>
        </div>

        <!-- 4x8 item grid -->
        <div class="bag-grid" id="bag-grid"></div>
      </div>

      <!-- Item detail modal -->
      <div class="bag-modal hidden" id="bag-modal">
        <div class="bag-modal__backdrop"></div>
        <div class="bag-modal__content" id="bag-modal-content"></div>
      </div>
    `;

    this.container.appendChild(this._el);
    this._modalEl = this._el.querySelector("#bag-modal");

    // Close button
    this._el.querySelector("#bag-close")!.addEventListener("click", () => this.close());

    // Close on backdrop click (bag overlay)
    this._el.addEventListener("click", (e: MouseEvent) => {
      if (e.target === this._el) this.close();
    });

    // Modal backdrop close
    this._modalEl!.querySelector(".bag-modal__backdrop")!.addEventListener("click", () => {
      this._closeModal();
    });

    // Sort buttons
    this._el.querySelector(".bag-sort-row")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".bag-sort-btn") as HTMLElement | null;
      if (!btn) return;
      const mode = btn.dataset.sort as SortMode;
      if (mode === this._sortMode) return;
      this._sortMode = mode;
      this._el!.querySelectorAll(".bag-sort-btn").forEach((b) => {
        b.classList.toggle("bag-sort-btn--active", (b as HTMLElement).dataset.sort === mode);
      });
      this._renderGrid();
    });

    // Tab clicks (delegated)
    this._el.querySelector("#bag-tabs")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".bag-tab") as HTMLElement | null;
      if (!btn) return;
      const tab = btn.dataset.tab as TabType;
      if (tab === this._activeTab) return;
      this._activeTab = tab;
      this._el!.querySelectorAll(".bag-tab").forEach((b) => {
        b.classList.toggle("bag-tab--active", (b as HTMLElement).dataset.tab === tab);
      });
      this._renderGrid();
    });

    // Grid clicks + long-press (delegated)
    const gridEl = this._el.querySelector("#bag-grid")!;

    gridEl.addEventListener("click", (e: Event) => {
      const cell = (e.target as HTMLElement).closest(".bag-cell[data-idx]") as HTMLElement | null;
      if (!cell) return;
      const idx = parseInt(cell.dataset.idx!, 10);
      const item = this._displayedItems[idx];
      if (item) this._openItemModal(item);
    });

    // Long-press for tooltip
    let lpTarget: HTMLElement | null = null;
    gridEl.addEventListener("touchstart", (e: Event) => {
      const te = e as TouchEvent;
      const cell = (te.target as HTMLElement).closest(".bag-cell[data-idx]") as HTMLElement | null;
      if (!cell) return;
      const idx = parseInt(cell.dataset.idx!, 10);
      const item = this._displayedItems[idx];
      if (!item) return;
      lpTarget = cell;
      this._tooltip.startLongPress(item, cell);
    }, { passive: true });

    gridEl.addEventListener("touchend", () => {
      this._tooltip.cancelLongPress();
      lpTarget = null;
    }, { passive: true });

    gridEl.addEventListener("touchcancel", () => {
      this._tooltip.cancelLongPress();
      lpTarget = null;
    }, { passive: true });

    // Mouse long-press (desktop)
    gridEl.addEventListener("mousedown", (e: Event) => {
      const me = e as MouseEvent;
      const cell = (me.target as HTMLElement).closest(".bag-cell[data-idx]") as HTMLElement | null;
      if (!cell) return;
      const idx = parseInt(cell.dataset.idx!, 10);
      const item = this._displayedItems[idx];
      if (!item) return;
      lpTarget = cell;
      this._tooltip.startLongPress(item, cell);
    });

    gridEl.addEventListener("mouseup", () => {
      this._tooltip.cancelLongPress();
      lpTarget = null;
    });

    gridEl.addEventListener("mouseleave", () => {
      this._tooltip.cancelLongPress();
      lpTarget = null;
    });
  }

  /* ── Tabs ───────────────────────────────────────────────── */

  _renderTabs(): void {
    const tabsEl = this._el!.querySelector("#bag-tabs");
    if (!tabsEl) return;

    const items = this._getBagItems();

    // Collect all unique tab keys present in bag
    const tabKeys = new Set<string>();
    for (const item of items) {
      tabKeys.add(getItemTabKey(item));
    }

    // "All" tab always first
    let html = `<button class="bag-tab ${this._activeTab === "all" ? "bag-tab--active" : ""}" data-tab="all">
      <span class="bag-tab__icon">${TAB_CONFIG.all.icon}</span>
      <span class="bag-tab__label">${TAB_CONFIG.all.label}</span>
      <span class="bag-tab__count">${items.length}</span>
    </button>`;

    // Ordered tab keys (equipment slots first, then non-equipment)
    const orderedKeys = [
      "weapon", "helmet", "armor", "gloves", "belt", "boots", "ring", "amulet",
      "potion", "map_key", "boss_map_key",
    ];

    for (const key of orderedKeys) {
      if (!tabKeys.has(key)) continue;
      const cfg = TAB_CONFIG[key] || { label: key, icon: "?" };
      const count = items.filter((i) => getItemTabKey(i) === key).length;
      html += `<button class="bag-tab ${this._activeTab === key ? "bag-tab--active" : ""}" data-tab="${key}">
        <span class="bag-tab__icon">${cfg.icon}</span>
        <span class="bag-tab__label">${cfg.label}</span>
        <span class="bag-tab__count">${count}</span>
      </button>`;
    }

    tabsEl.innerHTML = html;
  }

  /* ── Grid rendering ────────────────────────────────────── */

  _getBagItems(): BagItem[] {
    return this.state.bag ? [...this.state.bag] : [];
  }

  _renderGrid(): void {
    const gridEl = this._el!.querySelector("#bag-grid");
    if (!gridEl) return;

    let items = this._getBagItems();

    // Filter by active tab (using slot-based keys for equipment)
    if (this._activeTab !== "all") {
      items = items.filter((i) => getItemTabKey(i) === this._activeTab);
    }

    // Sort
    this._sortItems(items);
    this._displayedItems = items;

    // Build cells
    let html = "";
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (i < items.length) {
        const item = items[i];
        const quality = item.quality || "common";
        const iconHtml = this._getItemIconHtml(item);
        html += `
          <div class="bag-cell bag-cell--${quality}" data-idx="${i}">
            <div class="bag-cell__icon">${iconHtml}</div>
            <div class="bag-cell__level">${this._getItemBadge(item)}</div>
          </div>
        `;
      } else {
        html += `<div class="bag-cell bag-cell--empty"></div>`;
      }
    }

    gridEl.innerHTML = html;
  }

  _getItemIconHtml(item: BagItem): string {
    if (item.type === "potion" && item.flaskType) {
      const charges = Math.min(Math.max(item.currentCharges ?? item.maxCharges ?? 1, 1), 5);
      return `<img src="/assets/equipments/consumables/${item.flaskType}s/red_${charges}.png" style="width:32px;height:32px;image-rendering:pixelated">`;
    }
    if (item.type === "equipment" && item.icon) {
      return `<img src="${item.icon}" style="width:32px;height:32px;image-rendering:pixelated">`;
    }
    return item.icon || "?";
  }

  _getItemBadge(item: BagItem): string {
    if (item.type === "potion" && item.maxCharges) {
      return `${item.currentCharges ?? item.maxCharges}/${item.maxCharges}`;
    }
    if (item.type === "equipment" && item.properties?.reqLevel) {
      return `Lv.${item.properties.reqLevel}`;
    }
    if (item.tier) return `T${item.tier}`;
    if (item.level) return `Lv.${item.level}`;
    return "";
  }

  _sortItems(items: BagItem[]): void {
    switch (this._sortMode) {
      case "quality":
        items.sort((a, b) => (QUALITY_ORDER[b.quality] || 0) - (QUALITY_ORDER[a.quality] || 0));
        break;
      case "level":
        items.sort((a, b) => (b.level || b.tier || 0) - (a.level || a.tier || 0));
        break;
      case "newest":
      default:
        items.sort((a, b) => (b.acquiredAt || 0) - (a.acquiredAt || 0));
        break;
    }
  }

  /* ── Item detail modal ──────────────────────────────────── */

  _openItemModal(item: BagItem): void {
    this._tooltip.hide();
    if (!this._modalEl) return;

    const contentEl = this._modalEl.querySelector("#bag-modal-content")!;
    const q = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;

    const char = this.state.getActiveCharacter();
    const equipment = (char?.inventory?.equipment || {}) as Record<string, any>;

    let bodyHtml = "";

    if (item.type === "potion" && item.flaskType) {
      const healPct = Math.round((item.healPercent || 0) * 100);
      const charges = item.currentCharges ?? item.maxCharges ?? 0;
      const maxCharges = item.maxCharges ?? 0;
      const spriteIdx = Math.min(Math.max(charges, 1), 5);

      bodyHtml = `
        <div class="bag-modal__sprite">
          <img src="/assets/equipments/consumables/${item.flaskType}s/red_${spriteIdx}.png"
               style="width:64px;height:64px;image-rendering:pixelated">
        </div>
        <div class="bag-modal__stats">
          <div class="bag-modal__stat-row">
            <span class="bag-modal__stat-label">Heal</span>
            <span class="bag-modal__stat-val bag-modal__stat-val--heal">${healPct}% HP</span>
          </div>
          <div class="bag-modal__stat-row">
            <span class="bag-modal__stat-label">Charges</span>
            <span class="bag-modal__stat-val">${charges} / ${maxCharges}</span>
          </div>
        </div>

        <!-- Equip buttons with comparison -->
        <div class="bag-modal__equip-row">
          ${this._renderEquipBtn(item, "consumable-1", "Q", equipment)}
          ${this._renderEquipBtn(item, "consumable-2", "E", equipment)}
        </div>
      `;
    } else if (item.type === "map_key") {
      bodyHtml = `
        <div class="bag-modal__stats">
          <div class="bag-modal__stat-row">
            <span class="bag-modal__stat-label">Tier</span>
            <span class="bag-modal__stat-val">${item.tier || 1}</span>
          </div>
        </div>
      `;
    } else if (item.type === "boss_map_key") {
      const tierNames: Record<number, string> = { 1: "Standard", 2: "Empowered", 3: "Mythic" };
      bodyHtml = `
        <div class="bag-modal__stats">
          <div class="bag-modal__stat-row">
            <span class="bag-modal__stat-label">Boss Tier</span>
            <span class="bag-modal__stat-val">${tierNames[item.bossKeyTier || 1] || "Unknown"}</span>
          </div>
        </div>
      `;
    } else if (item.type === "equipment") {
      bodyHtml = this._renderEquipmentModal(item, char, equipment);
    }

    // Lore (equipment from catalogs, potions from POTION_LORE)
    const loreText = item.type === 'equipment' && item.icon
      ? getLore(item.icon)
      : item.type === 'potion' && item.flaskType
        ? POTION_LORE[item.flaskType] || undefined
        : undefined;
    const loreHtml = loreText
      ? `<div class="equip-potion-modal__lore">${loreText}</div>`
      : '';

    const sellPrice = calcSellPrice(item);

    contentEl.innerHTML = `
      <button class="bag-modal__close">&times;</button>
      <div class="bag-modal__name" style="color:${q.color}">${item.name}</div>
      <div class="bag-modal__quality" style="color:${q.color}">${q.label}</div>
      ${bodyHtml}
      <div class="bag-modal__actions-row">
        <button class="bag-modal__sell-btn" data-item-id="${item.id}">
          Sell <span class="bag-modal__sell-price">${sellPrice} &#x1FA99;</span>
        </button>
        <button class="bag-modal__discard-btn" data-item-id="${item.id}">Discard</button>
      </div>
      ${loreHtml}
    `;

    // Show modal
    this._modalEl.classList.remove("hidden");

    // Wire close
    contentEl.querySelector(".bag-modal__close")!.addEventListener("click", () => this._closeModal());

    // Wire sell
    contentEl.querySelector(".bag-modal__sell-btn")!.addEventListener("click", async () => {
      await this._sellItem(item.id);
    });

    // Wire discard
    contentEl.querySelector(".bag-modal__discard-btn")!.addEventListener("click", async () => {
      await this._discardItem(item.id);
    });

    // Wire equip buttons (potions)
    contentEl.querySelectorAll(".bag-modal__equip-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const slot = (btn as HTMLElement).dataset.slot!;
        await this._equipPotion(item.id, slot);
      });
    });

    // Wire equip-item buttons (gear)
    contentEl.querySelectorAll(".bag-modal__equip-item-btn").forEach((btn) => {
      if ((btn as HTMLElement).classList.contains("bag-modal__equip-item-btn--disabled")) return;
      btn.addEventListener("click", async () => {
        const slot = (btn as HTMLElement).dataset.slot!;
        await this._equipItem(item.id, slot);
      });
    });
  }

  _renderEquipBtn(item: BagItem, slot: string, key: string, equipment: Record<string, any>): string {
    const current = equipment[slot];
    let compHtml = "";

    if (current && current.flaskType) {
      const curHeal = Math.round((current.healPercent || 0) * 100);
      const newHeal = Math.round((item.healPercent || 0) * 100);
      const curCharges = current.maxCharges || 0;
      const newCharges = item.maxCharges || 0;
      const spriteIdx = Math.min(Math.max(current.currentCharges || 1, 1), 5);

      const healDiff = newHeal - curHeal;
      const chargeDiff = newCharges - curCharges;
      const healColor = healDiff > 0 ? "#44ff44" : healDiff < 0 ? "#ff4444" : "#aaa";
      const chargeColor = chargeDiff > 0 ? "#44ff44" : chargeDiff < 0 ? "#ff4444" : "#aaa";

      compHtml = `
        <div class="bag-modal__compare">
          <div class="bag-modal__compare-current">
            <img src="/assets/equipments/consumables/${current.flaskType}s/red_${spriteIdx}.png"
                 style="width:24px;height:24px;image-rendering:pixelated">
            <span class="bag-modal__compare-name">${current.name || current.flaskType}</span>
          </div>
          <div class="bag-modal__compare-stats">
            <span style="color:${healColor}">Heal: ${newHeal}% ${healDiff > 0 ? "+" : ""}${healDiff !== 0 ? healDiff + "%" : ""}</span>
            <span style="color:${chargeColor}">Charges: ${newCharges} ${chargeDiff > 0 ? "+" : ""}${chargeDiff !== 0 ? chargeDiff : ""}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="bag-modal__equip-slot">
        <button class="bag-modal__equip-btn" data-slot="${slot}">
          Equip ${key}
        </button>
        ${compHtml}
      </div>
    `;
  }

  /** Render the item detail body for equipment items (stats + equip buttons). */
  _renderEquipmentModal(
    item: BagItem,
    char: { level: number; inventory?: { equipment?: Record<string, any> } } | null,
    equipment: Record<string, any>,
  ): string {
    const props = item.properties || {};
    const sub = SUBTYPES.find(s => s.code === props.subtype);
    const subtypeName = sub?.name || props.subtype || '';
    const reqLevel = props.reqLevel || 0;
    const charLevel = char?.level || 0;
    const canEquip = charLevel >= reqLevel;

    let statsHtml = '<div class="bag-modal__stats">';

    // Base stats
    if (props.baseDamage) {
      statsHtml += `<div class="bag-modal__stat-row"><span class="bag-modal__stat-label">Base Damage</span><span class="bag-modal__stat-val">${props.baseDamage}</span></div>`;
    }
    if (props.baseArmor) {
      statsHtml += `<div class="bag-modal__stat-row"><span class="bag-modal__stat-label">Base Armour</span><span class="bag-modal__stat-val">${props.baseArmor}</span></div>`;
    }
    if (props.baseEvasion) {
      statsHtml += `<div class="bag-modal__stat-row"><span class="bag-modal__stat-label">Base Evasion</span><span class="bag-modal__stat-val">${props.baseEvasion}</span></div>`;
    }
    if (props.baseES) {
      statsHtml += `<div class="bag-modal__stat-row"><span class="bag-modal__stat-label">Base ES</span><span class="bag-modal__stat-val">${props.baseES}</span></div>`;
    }

    // Implicit
    if (props.implicit) {
      const implDef = STAT_DEFS[props.implicit.id as StatId];
      const implName = implDef?.name || props.implicit.id;
      const implUnit = implDef?.unit === '+N%' ? '%' : implDef?.unit === '+N/s' ? '/s' : '';
      statsHtml += `<div class="bag-modal__stat-row" style="color:#b0a060"><span class="bag-modal__stat-label">Implicit</span><span class="bag-modal__stat-val">+${props.implicit.value}${implUnit} ${implName}</span></div>`;
    }

    // Rolled stats
    for (const stat of props.stats || []) {
      const def = STAT_DEFS[stat.id as StatId];
      const name = def?.name || stat.id;
      const unit = def?.unit === '+N%' ? '%' : def?.unit === '+N/s' ? '/s' : '';
      statsHtml += `<div class="bag-modal__stat-row"><span class="bag-modal__stat-label">${name}</span><span class="bag-modal__stat-val">+${stat.value}${unit}</span></div>`;
    }

    // Req level
    const lvlColor = canEquip ? '#888' : '#ff4444';
    statsHtml += `<div class="bag-modal__stat-row" style="margin-top:6px"><span class="bag-modal__stat-label" style="color:${lvlColor}">Required Level</span><span class="bag-modal__stat-val" style="color:${lvlColor}">${reqLevel}</span></div>`;
    statsHtml += '</div>';

    // Equip buttons
    const itemSlot = props.slot as EquipmentSlotId;
    const validSlots = itemSlot ? getValidUISlots(itemSlot) : [];

    const SLOT_LABELS: Record<string, string> = {
      'weapon-left': 'Left Hand', 'weapon-right': 'Right Hand',
      'head': 'Helmet', 'chest': 'Armor',
      'accessory-1': 'Ring L', 'accessory-2': 'Amulet', 'accessory-3': 'Ring R',
      'gloves': 'Gloves', 'belt': 'Belt', 'boots': 'Boots',
    };

    let equipHtml = '<div class="bag-modal__equip-row">';
    for (const slotId of validSlots) {
      const label = SLOT_LABELS[slotId] || slotId;
      const disabledCls = canEquip ? '' : 'bag-modal__equip-item-btn--disabled';
      const disabledTitle = canEquip ? '' : `title="Level ${reqLevel} required"`;
      equipHtml += `
        <div class="bag-modal__equip-slot">
          <button class="bag-modal__equip-item-btn ${disabledCls}" data-slot="${slotId}" ${disabledTitle}>
            Equip → ${label}
          </button>
        </div>
      `;
    }
    equipHtml += '</div>';

    if (!canEquip) {
      equipHtml += `<div class="bag-modal__level-warn" style="color:#ff4444;font-size:12px;text-align:center;margin-top:4px">Your level ${charLevel} is too low (need ${reqLevel})</div>`;
    }

    // Lore from catalog
    const loreText = item.icon ? getLore(item.icon) : undefined;
    const loreHtml = loreText
      ? `<div class="equip-potion-modal__lore">${loreText}</div>`
      : '';

    // Equipment icon sprite
    const iconHtml = item.icon
      ? `<div class="bag-modal__sprite"><img src="${item.icon}" style="width:64px;height:64px;image-rendering:pixelated"></div>`
      : '';

    return `
      ${iconHtml}
      <div class="bag-modal__type-label">${subtypeName}</div>
      ${statsHtml}
      ${equipHtml}
    `;
  }

  _closeModal(): void {
    if (this._modalEl) {
      this._modalEl.classList.add("hidden");
    }
  }

  /* ── Actions ────────────────────────────────────────────── */

  async _equipPotion(itemId: string, slot: string): Promise<void> {
    try {
      await loot.equipPotion(itemId, slot);
      this._closeModal();
      await this.state.refreshState();
      this._renderTabs();
      this._renderGrid();
    } catch (err) {
      console.error("[ChestPanel] Equip failed:", err);
    }
  }

  async _equipItem(itemId: string, slotId: string): Promise<void> {
    try {
      await loot.equipItem(itemId, slotId);
      this._closeModal();
      await this.state.refreshState();
      this._renderTabs();
      this._renderGrid();
      this.events.emit("equipmentChanged");
    } catch (err: any) {
      console.error("[ChestPanel] Equip item failed:", err);
      // Show error message to user if it's a level check failure
      if (err?.message?.includes('too low')) {
        alert(err.message);
      }
    }
  }

  async _sellItem(itemId: string): Promise<void> {
    try {
      const result = await loot.sellItem(itemId);
      this._closeModal();
      await this.state.refreshState();
      this._renderTabs();
      this._renderGrid();
      this.events.emit("goldChanged", { gold: result.gold });
    } catch (err) {
      console.error("[ChestPanel] Sell failed:", err);
    }
  }

  async _discardItem(itemId: string): Promise<void> {
    try {
      await loot.discardItem(itemId);
      this._closeModal();
      await this.state.refreshState();
      this._renderTabs();
      this._renderGrid();
    } catch (err) {
      console.error("[ChestPanel] Discard failed:", err);
    }
  }

  /* ── Open / Close ──────────────────────────────────────── */

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this._renderTabs();
    this._renderGrid();

    this._el!.classList.remove("hidden", "bag-closing");
    void this._el!.offsetHeight;
    this._el!.classList.add("bag-visible");

    this.events.emit("chestOpened");
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._tooltip.hide();
    this._closeModal();

    this._el!.classList.remove("bag-visible");
    this._el!.classList.add("bag-closing");

    const onDone = (): void => {
      this._el!.removeEventListener("transitionend", onDone);
      this._el!.classList.remove("bag-closing");
      this._el!.classList.add("hidden");
    };
    this._el!.addEventListener("transitionend", onDone);

    this.events.emit("chestClosed");
  }

  destroy(): void {
    this._tooltip.destroy();
    if (this._el) this._el.remove();
  }
}
