/**
 * ChestPanel — bag overlay with tabs, sorting, long-press tooltip,
 * item detail modal with equip/discard actions.
 *
 * Tabs: "All" + dynamic tabs per item type in bag.
 * Sorting: Quality / Level / Newest (applies within active tab).
 * Long-press (300ms): shows floating ItemTooltip.
 * Tap: opens item detail modal (equip potions, discard, compare).
 */

import type { BagItem } from "../types.js";
import { ItemTooltip, QUALITY_COLORS } from "./item-tooltip.js";
import { loot } from "../api.js";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface GameState {
  getActiveCharacter(): {
    bag: BagItem[];
    inventory?: { equipment?: Record<string, any> };
  } | null;
  bag: BagItem[];
  refreshState(): Promise<void>;
}

type SortMode = "quality" | "level" | "newest";
type TabType = "all" | string;

/** Quality tier order for sorting (higher = better). */
const QUALITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Tab display config. */
const TAB_CONFIG: Record<string, { label: string; icon: string }> = {
  all:          { label: "All",       icon: "&#x2B1A;" },
  potion:       { label: "Potions",   icon: "&#x1F9EA;" },
  map_key:      { label: "Maps",      icon: "&#x1F5FA;" },
  boss_map_key: { label: "Boss",      icon: "&#x1F480;" },
};

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
    const types = new Set(items.map((i) => i.type));

    let html = `<button class="bag-tab ${this._activeTab === "all" ? "bag-tab--active" : ""}" data-tab="all">
      <span class="bag-tab__icon">${TAB_CONFIG.all.icon}</span>
      <span class="bag-tab__label">${TAB_CONFIG.all.label}</span>
      <span class="bag-tab__count">${items.length}</span>
    </button>`;

    for (const type of types) {
      const cfg = TAB_CONFIG[type] || { label: type, icon: "?" };
      const count = items.filter((i) => i.type === type).length;
      html += `<button class="bag-tab ${this._activeTab === type ? "bag-tab--active" : ""}" data-tab="${type}">
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

    // Filter by active tab
    if (this._activeTab !== "all") {
      items = items.filter((i) => i.type === this._activeTab);
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
      return `<img src="/assets/potions/${item.flaskType}/red_${charges}.png" style="width:32px;height:32px;image-rendering:pixelated">`;
    }
    return item.icon || "?";
  }

  _getItemBadge(item: BagItem): string {
    if (item.type === "potion" && item.maxCharges) {
      return `${item.currentCharges ?? item.maxCharges}/${item.maxCharges}`;
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
          <img src="/assets/potions/${item.flaskType}/red_${spriteIdx}.png"
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
    }

    contentEl.innerHTML = `
      <button class="bag-modal__close">&times;</button>
      <div class="bag-modal__name" style="color:${q.color}">${item.name}</div>
      <div class="bag-modal__quality" style="color:${q.color}">${q.label}</div>
      ${bodyHtml}
      <button class="bag-modal__discard-btn" data-item-id="${item.id}">Discard</button>
    `;

    // Show modal
    this._modalEl.classList.remove("hidden");

    // Wire close
    contentEl.querySelector(".bag-modal__close")!.addEventListener("click", () => this._closeModal());

    // Wire discard
    contentEl.querySelector(".bag-modal__discard-btn")!.addEventListener("click", async () => {
      await this._discardItem(item.id);
    });

    // Wire equip buttons
    contentEl.querySelectorAll(".bag-modal__equip-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const slot = (btn as HTMLElement).dataset.slot!;
        await this._equipPotion(item.id, slot);
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
            <img src="/assets/potions/${current.flaskType}/red_${spriteIdx}.png"
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
