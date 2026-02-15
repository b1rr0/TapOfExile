/**
 * ItemTooltip — floating tooltip shown on long-press (300ms).
 *
 * Shows item name (colored by quality), type, stats.
 * Used by ChestPanel and Equipment panel.
 */

import type { BagItem } from "../types.js";

/** Quality display colours. */
export const QUALITY_COLORS: Record<string, { label: string; color: string }> = {
  common:    { label: "Common",    color: "#9e9e9e" },
  rare:      { label: "Rare",      color: "#4fc3f7" },
  epic:      { label: "Epic",      color: "#ffd740" },
  legendary: { label: "Legendary", color: "#ff9100" },
};

/** Item type display labels. */
const TYPE_LABELS: Record<string, string> = {
  potion:       "Potion",
  map_key:      "Map Key",
  boss_map_key: "Boss Key",
};

export class ItemTooltip {
  private _el: HTMLElement;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _visible = false;

  constructor() {
    this._el = document.createElement("div");
    this._el.className = "item-tooltip";
    this._el.style.display = "none";
    document.body.appendChild(this._el);

    // Hide on any touch move (finger dragged away)
    document.addEventListener("touchmove", () => this.hide(), { passive: true });
  }

  /**
   * Start long-press timer. Call from touchstart / mousedown.
   * After 300ms, shows the tooltip near the target element.
   */
  startLongPress(item: BagItem, target: HTMLElement): void {
    this.hide();
    this._timer = setTimeout(() => {
      this._show(item, target);
    }, 300);
  }

  /**
   * Cancel long-press. Call from touchend / mouseup / touchcancel.
   */
  cancelLongPress(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    // Small delay before hiding so the tooltip is visible briefly on quick release
    if (this._visible) {
      setTimeout(() => this.hide(), 50);
    }
  }

  hide(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._el.style.display = "none";
    this._visible = false;
  }

  private _show(item: BagItem, target: HTMLElement): void {
    const q = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    let statsHtml = "";

    if (item.type === "potion" && item.flaskType) {
      const healPct = Math.round((item.healPercent || 0) * 100);
      const charges = item.currentCharges ?? item.maxCharges ?? 0;
      const maxCharges = item.maxCharges ?? 0;
      const spriteIdx = Math.min(Math.max(charges, 1), 5);
      statsHtml = `
        <div class="item-tooltip__sprite">
          <img src="/assets/potions/${item.flaskType}/red_${spriteIdx}.png"
               style="width:40px;height:40px;image-rendering:pixelated">
        </div>
        <div class="item-tooltip__stat">Heal: <span class="item-tooltip__val item-tooltip__val--heal">${healPct}%</span> HP</div>
        <div class="item-tooltip__stat">Charges: <span class="item-tooltip__val">${charges}/${maxCharges}</span></div>
      `;
    } else if (item.type === "map_key") {
      statsHtml = `
        <div class="item-tooltip__stat">Tier: <span class="item-tooltip__val">${item.tier || 1}</span></div>
      `;
    } else if (item.type === "boss_map_key") {
      const tierNames: Record<number, string> = { 1: "Standard", 2: "Empowered", 3: "Mythic" };
      const tierName = tierNames[item.bossKeyTier || 1] || `Tier ${item.bossKeyTier}`;
      statsHtml = `
        <div class="item-tooltip__stat">Boss Tier: <span class="item-tooltip__val">${tierName}</span></div>
      `;
    }

    this._el.innerHTML = `
      <div class="item-tooltip__name" style="color:${q.color}">${item.name}</div>
      <div class="item-tooltip__meta">
        <span class="item-tooltip__quality" style="color:${q.color}">${q.label}</span>
        <span class="item-tooltip__type">${typeLabel}</span>
      </div>
      ${statsHtml}
    `;

    this._el.style.display = "block";
    this._visible = true;

    // Position near the target, clamped to viewport
    const rect = target.getBoundingClientRect();
    const ttRect = this._el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left + rect.width / 2 - ttRect.width / 2;
    let top = rect.top - ttRect.height - 8;

    // If no room above, show below
    if (top < 4) {
      top = rect.bottom + 8;
    }
    // Clamp horizontal
    if (left < 4) left = 4;
    if (left + ttRect.width > vw - 4) left = vw - ttRect.width - 4;
    // Clamp vertical
    if (top + ttRect.height > vh - 4) top = vh - ttRect.height - 4;

    this._el.style.left = `${left}px`;
    this._el.style.top = `${top}px`;
  }

  destroy(): void {
    this.hide();
    this._el.remove();
  }
}
