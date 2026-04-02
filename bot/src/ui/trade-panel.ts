/**
 * TradePanel - fullscreen overlay with 4 tabs:
 *  1. Market  - browse/filter/buy listings
 *  2. Sell    - pick bag item → set price → list
 *  3. My Listings - active listings with cancel
 *  4. History - past trades
 *
 * Follows FriendsPanel pattern (overlay lifecycle, tabs, toasts).
 */

import { trade, loot } from "../api.js";
import { SUBTYPES } from "@shared/equipment-defs";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface GameState {
  data: { gold: number; player?: { level: number } };
  getActiveCharacter(): { id: string; bag: any[]; leagueId?: string; level: number; [k: string]: any } | null;
  refreshState(): Promise<void>;
}

type TabType = "market" | "sell" | "my_listings" | "history";

const QUALITY_ORDER = ["legendary", "epic", "rare", "common"];

const QUALITY_COLORS: Record<string, string> = {
  common: "var(--game-text)",
  rare: "#4FC3F7",
  epic: "#CE93D8",
  legendary: "#FFD54F",
};

const TYPE_ICONS: Record<string, string> = {
  potion: "\uD83E\uDDEA",
  map_key: "\uD83D\uDDFA\uFE0F",
  boss_key: "\uD83D\uDC80",
  equipment: "\u2694\uFE0F",
};

const TYPE_LABELS: Record<string, string> = {
  potion: "Potions",
  map_key: "Map Keys",
  boss_key: "Boss Keys",
  equipment: "Gear",
};

function formatGold(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export class TradePanel {
  container: HTMLElement;
  events: EventBus;
  state: GameState;
  isOpen: boolean;
  _el: HTMLElement | null;
  _activeTab: TabType;
  _searchTimer: ReturnType<typeof setTimeout> | null;
  _modalEl: HTMLElement | null;
  _filters: { itemType: string; quality: string; search: string; sort: string };

  constructor(container: HTMLElement, events: EventBus, state: GameState) {
    this.container = container;
    this.events = events;
    this.state = state;
    this.isOpen = false;
    this._el = null;
    this._activeTab = "market";
    this._searchTimer = null;
    this._modalEl = null;
    this._filters = { itemType: "all", quality: "all", search: "", sort: "newest" };

    this._createPanel();
  }

  /* ── Panel creation ────────────────────────────────────── */

  _createPanel(): void {
    this._el = document.createElement("div");
    this._el.className = "trade-overlay hidden";

    this._el.innerHTML = `
      <div class="trade-panel">
        <button class="trade-close-btn" id="trade-close">&times;</button>
        <h2 class="trade-title">Trade Market</h2>

        <div class="trade-gold-row">
          <span class="trade-gold-icon">&#x1FA99;</span>
          <span class="trade-gold-value" id="trade-gold-value">${formatGold(this.state.data.gold)}</span>
        </div>

        <div class="trade-tabs" id="trade-tabs">
          <button class="trade-tab trade-tab--active" data-tab="market">Market</button>
          <button class="trade-tab" data-tab="sell">Sell</button>
          <button class="trade-tab" data-tab="my_listings">My</button>
          <button class="trade-tab" data-tab="history">History</button>
        </div>

        <div class="trade-content" id="trade-content"></div>
      </div>

      <div class="trade-modal hidden" id="trade-modal">
        <div class="trade-modal__backdrop"></div>
        <div class="trade-modal__content" id="trade-modal-content"></div>
      </div>
    `;

    this.container.appendChild(this._el);
    this._modalEl = this._el.querySelector("#trade-modal");

    // Close button
    this._el.querySelector("#trade-close")!.addEventListener("click", () => this.close());

    // Close on backdrop click
    this._el.addEventListener("click", (e: MouseEvent) => {
      if (e.target === this._el) this.close();
    });

    // Modal backdrop close
    this._modalEl!.querySelector(".trade-modal__backdrop")!
      .addEventListener("click", () => this._closeModal());

    // Tab clicks
    this._el.querySelector("#trade-tabs")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".trade-tab") as HTMLElement | null;
      if (!btn) return;
      const tab = btn.dataset.tab as TabType;
      if (tab === this._activeTab) return;
      this._activeTab = tab;
      this._el!.querySelectorAll(".trade-tab").forEach((b) => {
        b.classList.toggle("trade-tab--active", (b as HTMLElement).dataset.tab === tab);
      });
      this._renderContent();
    });
  }

  /* ── Content rendering ────────────────────────────────── */

  async _renderContent(): Promise<void> {
    const contentEl = this._el!.querySelector("#trade-content")! as HTMLElement;

    // Update gold display
    const goldEl = this._el!.querySelector("#trade-gold-value");
    if (goldEl) goldEl.textContent = formatGold(this.state.data.gold);

    contentEl.innerHTML = `<div class="trade-loading">Loading...</div>`;

    switch (this._activeTab) {
      case "market":
        await this._renderMarket(contentEl);
        break;
      case "sell":
        this._renderSell(contentEl);
        break;
      case "my_listings":
        await this._renderMyListings(contentEl);
        break;
      case "history":
        await this._renderHistory(contentEl);
        break;
    }
  }

  /* ── Market tab ────────────────────────────────────────── */

  async _renderMarket(el: HTMLElement): Promise<void> {
    // Filters bar
    const filterHtml = `
      <div class="trade-filter-row">
        <div class="trade-filter-chips" id="trade-type-chips">
          <button class="trade-chip ${this._filters.itemType === "all" ? "trade-chip--active" : ""}" data-type="all">All</button>
          ${Object.entries(TYPE_LABELS).map(([k, v]) =>
            `<button class="trade-chip ${this._filters.itemType === k ? "trade-chip--active" : ""}" data-type="${k}">${TYPE_ICONS[k]} ${v}</button>`
          ).join("")}
        </div>
        <div class="trade-filter-chips" id="trade-quality-chips">
          <button class="trade-chip ${this._filters.quality === "all" ? "trade-chip--active" : ""}" data-quality="all">All</button>
          ${["common", "rare", "epic", "legendary"].map((q) =>
            `<button class="trade-chip trade-chip--${q} ${this._filters.quality === q ? "trade-chip--active" : ""}" data-quality="${q}">${q}</button>`
          ).join("")}
        </div>
        <input class="trade-search-input" type="text" placeholder="Search items..." maxlength="64" id="trade-search-input" value="${this._escapeHtml(this._filters.search)}">
        <div class="trade-sort-row">
          ${["newest", "price_asc", "price_desc"].map((s) => {
            const label = s === "newest" ? "Newest" : s === "price_asc" ? "Price \u2191" : "Price \u2193";
            return `<button class="trade-sort-btn ${this._filters.sort === s ? "trade-sort-btn--active" : ""}" data-sort="${s}">${label}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="trade-listings" id="trade-listings"></div>
    `;

    el.innerHTML = filterHtml;

    // Wire filter chips
    el.querySelector("#trade-type-chips")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".trade-chip") as HTMLElement | null;
      if (!btn || !btn.dataset.type) return;
      this._filters.itemType = btn.dataset.type;
      this._renderMarket(el);
    });

    el.querySelector("#trade-quality-chips")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".trade-chip") as HTMLElement | null;
      if (!btn || !btn.dataset.quality) return;
      this._filters.quality = btn.dataset.quality;
      this._renderMarket(el);
    });

    // Search
    const searchInput = el.querySelector("#trade-search-input") as HTMLInputElement;
    searchInput.addEventListener("input", () => {
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this._filters.search = searchInput.value.trim();
        this._loadListings(el.querySelector("#trade-listings")! as HTMLElement);
      }, 400);
    });

    // Sort
    el.querySelector(".trade-sort-row")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".trade-sort-btn") as HTMLElement | null;
      if (!btn || !btn.dataset.sort) return;
      this._filters.sort = btn.dataset.sort;
      el.querySelectorAll(".trade-sort-btn").forEach((b) => {
        b.classList.toggle("trade-sort-btn--active", (b as HTMLElement).dataset.sort === this._filters.sort);
      });
      this._loadListings(el.querySelector("#trade-listings")! as HTMLElement);
    });

    // Initial load
    await this._loadListings(el.querySelector("#trade-listings")! as HTMLElement);
  }

  async _loadListings(listingsEl: HTMLElement): Promise<void> {
    listingsEl.innerHTML = `<div class="trade-loading">Loading...</div>`;

    try {
      const char = this.state.getActiveCharacter();
      const params: Record<string, string> = { sort: this._filters.sort };
      if (this._filters.itemType !== "all") params.itemType = this._filters.itemType;
      if (this._filters.quality !== "all") params.quality = this._filters.quality;
      if (this._filters.search) params.search = this._filters.search;
      if (char?.leagueId) params.leagueId = char.leagueId;

      const data = await trade.browse(params);
      const listings: any[] = data.listings || [];

      if (listings.length === 0) {
        listingsEl.innerHTML = `<div class="trade-empty">No listings found</div>`;
        return;
      }

      // Detect own listings via Telegram user ID
      const tg = (window as any).Telegram?.WebApp;
      const myTelegramId = String(tg?.initDataUnsafe?.user?.id || "");

      listingsEl.innerHTML = listings.map((l: any) => {
        const isOwn = myTelegramId && l.sellerTelegramId === myTelegramId;
        return `
          <div class="trade-listing-card ${isOwn ? "trade-listing-card--own" : ""}" data-listing-id="${l.id}">
            <div class="trade-listing-card__icon">${TYPE_ICONS[l.itemType] || "?"}</div>
            <div class="trade-listing-card__info">
              <div class="trade-listing-card__name" style="color:${QUALITY_COLORS[l.itemQuality] || "var(--game-text)"}">${this._escapeHtml(l.itemName)}</div>
              <div class="trade-listing-card__meta">
                <span class="trade-listing-card__quality trade-quality--${l.itemQuality}">${l.itemQuality}</span>
                ${(() => { const sub = l.itemSubtype ? SUBTYPES.find((s: any) => s.code === l.itemSubtype) : null; const hand = sub?.slot === 'one_hand' ? '1H' : sub?.slot === 'two_hand' ? '2H' : ''; return sub ? `<span class="trade-listing-card__subtype">${sub.name}${hand ? ` (${hand})` : ''}</span>` : ''; })()}
                ${l.itemTier ? `<span class="trade-listing-card__tier">T${l.itemTier}</span>` : ""}
                ${l.itemLevel ? `<span class="trade-listing-card__level">Lv.${l.itemLevel}</span>` : ""}
                <span class="trade-listing-card__seller">${this._escapeHtml(l.sellerName || "???")}</span>
                ${isOwn ? `<span class="trade-listing-card__own-badge">YOUR</span>` : ""}
                <span class="trade-listing-card__time">${timeAgo(l.createdAt)}</span>
              </div>
            </div>
            <div class="trade-listing-card__price-col">
              <div class="trade-listing-card__price">${formatGold(l.price)}</div>
              ${isOwn
                ? `<span class="trade-listing-card__own-label">Your listing</span>`
                : `<button class="trade-listing-card__buy-btn">Buy</button>`}
            </div>
          </div>
        `;
      }).join("");

      // Buy click (only non-own listings have the button)
      listingsEl.addEventListener("click", (e: Event) => {
        const buyBtn = (e.target as HTMLElement).closest(".trade-listing-card__buy-btn") as HTMLElement | null;
        if (!buyBtn) return;
        const card = buyBtn.closest(".trade-listing-card") as HTMLElement;
        const listingId = card.dataset.listingId!;
        const listing = listings.find((l: any) => l.id === listingId);
        if (listing) this._openBuyModal(listing);
      });
    } catch (err) {
      console.error("[TradePanel] Load listings failed:", err);
      listingsEl.innerHTML = `<div class="trade-empty">Failed to load listings</div>`;
    }
  }

  /* ── Buy modal ─────────────────────────────────────────── */

  _openBuyModal(listing: any): void {
    const price = BigInt(listing.price);
    const tax = price * 5n / 100n;
    const total = price + tax;

    const snap = listing.itemSnapshot || {};
    const props = (snap.properties || {}) as Record<string, any>;
    const statsHtml = props.stats && Array.isArray(props.stats)
      ? props.stats.map((s: any) => `<div class="trade-modal__stat">${s.id}: +${s.value}</div>`).join("")
      : "";

    const content = this._modalEl!.querySelector("#trade-modal-content")!;
    content.innerHTML = `
      <button class="trade-modal__close" id="trade-modal-close">&times;</button>
      <div class="trade-modal__title">Confirm Purchase</div>
      <div class="trade-modal__item-preview">
        <span class="trade-modal__item-icon">${TYPE_ICONS[listing.itemType] || "?"}</span>
        <div class="trade-modal__item-info">
          <div class="trade-modal__item-name" style="color:${QUALITY_COLORS[listing.itemQuality] || "var(--game-text)"}">${this._escapeHtml(listing.itemName)}</div>
          <div class="trade-modal__item-meta">${listing.itemQuality}${(() => { const sub = listing.itemSubtype ? SUBTYPES.find((s: any) => s.code === listing.itemSubtype) : null; const hand = sub?.slot === 'one_hand' ? '1H' : sub?.slot === 'two_hand' ? '2H' : ''; return sub ? ` &middot; ${sub.name}${hand ? ` (${hand})` : ''}` : ''; })()}${listing.itemTier ? " &middot; T" + listing.itemTier : ""}${listing.itemLevel ? " &middot; Lv." + listing.itemLevel : ""}</div>
          ${statsHtml}
        </div>
      </div>
      <div class="trade-modal__price-breakdown">
        <div class="trade-modal__price-row">
          <span>Price</span>
          <span class="trade-modal__gold">${formatGold(listing.price)} gold</span>
        </div>
        <div class="trade-modal__price-row">
          <span>Tax (5%)</span>
          <span class="trade-modal__gold">${formatGold(tax.toString())} gold</span>
        </div>
        <div class="trade-modal__price-row trade-modal__price-row--total">
          <span>Total</span>
          <span class="trade-modal__gold">${formatGold(total.toString())} gold</span>
        </div>
      </div>
      <div class="trade-modal__actions">
        <button class="trade-modal__confirm-btn" id="trade-confirm-buy">Confirm Buy</button>
        <button class="trade-modal__cancel-btn" id="trade-cancel-buy">Cancel</button>
      </div>
    `;

    this._modalEl!.classList.remove("hidden");

    content.querySelector("#trade-modal-close")!.addEventListener("click", () => this._closeModal());
    content.querySelector("#trade-cancel-buy")!.addEventListener("click", () => this._closeModal());
    content.querySelector("#trade-confirm-buy")!.addEventListener("click", async () => {
      const btn = content.querySelector("#trade-confirm-buy") as HTMLButtonElement;
      btn.textContent = "...";
      btn.disabled = true;
      try {
        await trade.buy(listing.id);
        this._closeModal();
        await this.state.refreshState();
        this.events.emit("goldChanged", { gold: this.state.data.gold });
        this._showToast("Item purchased!");
        this._renderContent();
      } catch (err: any) {
        btn.textContent = "Confirm Buy";
        btn.disabled = false;
        this._showToast(err?.message || "Purchase failed");
      }
    });
  }

  /* ── Sell tab ──────────────────────────────────────────── */

  async _renderSell(el: HTMLElement): Promise<void> {
    const char = this.state.getActiveCharacter();
    if (!char) {
      el.innerHTML = `<div class="trade-empty">No active character</div>`;
      return;
    }

    // Refresh bag from server before showing
    el.innerHTML = `<div class="trade-empty">Loading bag...</div>`;
    try {
      await (this.state as any).refreshBag();
    } catch (_) { /* ignore */ }

    const bag: any[] = (this.state as any).bag || [];
    const sellable = bag.filter((item: any) => item.type !== "currency");

    if (sellable.length === 0) {
      el.innerHTML = `<div class="trade-empty">No items in bag to sell</div>`;
      return;
    }

    el.innerHTML = `
      <div class="trade-sell-header">Select an item to sell</div>
      <div class="trade-sell-grid">
        ${sellable.map((item: any) => `
          <div class="trade-sell-item" data-item-id="${item.id}">
            <div class="trade-sell-item__icon">${this._getItemIcon(item)}</div>
            <div class="trade-sell-item__name" style="color:${QUALITY_COLORS[item.quality] || "var(--game-text)"}">${this._escapeHtml(item.name)}</div>
            <div class="trade-sell-item__meta">${item.quality}${item.tier ? " T" + item.tier : ""}${item.level ? " Lv." + item.level : ""}</div>
          </div>
        `).join("")}
      </div>
    `;

    // Item click → open sell modal
    el.querySelector(".trade-sell-grid")!.addEventListener("click", (e: Event) => {
      const cell = (e.target as HTMLElement).closest(".trade-sell-item") as HTMLElement | null;
      if (!cell) return;
      const itemId = cell.dataset.itemId!;
      const item = sellable.find((i: any) => i.id === itemId);
      if (item) this._openSellModal(item);
    });
  }

  _getItemIcon(item: any): string {
    if (item.type === "potion" && item.flaskType) {
      const charges = Math.min(Math.max(item.currentCharges ?? item.maxCharges ?? 1, 1), 5);
      return `<img src="/assets/equipments/consumables/${item.flaskType}s/red_${charges}.png" style="width:32px;height:32px;image-rendering:pixelated">`;
    }
    if (item.type === "equipment" && item.icon) {
      return `<img src="${item.icon}" style="width:32px;height:32px;image-rendering:pixelated">`;
    }
    return TYPE_ICONS[item.type] || "?";
  }

  _openSellModal(item: any): void {
    const content = this._modalEl!.querySelector("#trade-modal-content")!;
    content.innerHTML = `
      <button class="trade-modal__close" id="trade-modal-close">&times;</button>
      <div class="trade-modal__title">Create Listing</div>
      <div class="trade-modal__item-preview">
        <span class="trade-modal__item-icon">${TYPE_ICONS[item.type] || "?"}</span>
        <div class="trade-modal__item-info">
          <div class="trade-modal__item-name" style="color:${QUALITY_COLORS[item.quality] || "var(--game-text)"}">${this._escapeHtml(item.name)}</div>
          <div class="trade-modal__item-meta">${item.quality}${item.tier ? " &middot; T" + item.tier : ""}${item.level ? " &middot; Lv." + item.level : ""}</div>
        </div>
      </div>
      <div class="trade-modal__price-input-row">
        <label class="trade-modal__label">Asking price (gold)</label>
        <input class="trade-price-input" type="number" min="1" step="1" placeholder="Enter price..." id="trade-price-input">
      </div>
      <div class="trade-commission-preview" id="trade-commission-preview">
        You will receive: <span class="trade-modal__gold">-</span>
      </div>
      <div class="trade-modal__actions">
        <button class="trade-modal__confirm-btn" id="trade-confirm-sell" disabled>List for Sale</button>
        <button class="trade-modal__cancel-btn" id="trade-cancel-sell">Cancel</button>
      </div>
    `;

    this._modalEl!.classList.remove("hidden");

    const priceInput = content.querySelector("#trade-price-input") as HTMLInputElement;
    const preview = content.querySelector("#trade-commission-preview")!;
    const confirmBtn = content.querySelector("#trade-confirm-sell") as HTMLButtonElement;

    priceInput.addEventListener("input", () => {
      const val = parseInt(priceInput.value, 10);
      if (val > 0) {
        const listingFee = BigInt(val) * 3n / 100n + 20n;
        preview.innerHTML = `Listing fee: <span class="trade-modal__gold">${formatGold(listingFee.toString())} gold</span> <span class="trade-commission-note">(3% + 20g)</span>`;
        confirmBtn.disabled = false;
      } else {
        preview.innerHTML = `Listing fee: <span class="trade-modal__gold">&mdash;</span>`;
        confirmBtn.disabled = true;
      }
    });

    content.querySelector("#trade-modal-close")!.addEventListener("click", () => this._closeModal());
    content.querySelector("#trade-cancel-sell")!.addEventListener("click", () => this._closeModal());
    confirmBtn.addEventListener("click", async () => {
      const price = priceInput.value.trim();
      if (!price || parseInt(price, 10) < 1) return;

      confirmBtn.textContent = "...";
      confirmBtn.disabled = true;
      try {
        await trade.createListing(item.id, price);
        this._closeModal();
        await this.state.refreshState();
        this._showToast(`Listed for ${formatGold(price)} gold!`);
        this._renderContent();
      } catch (err: any) {
        confirmBtn.textContent = "List for Sale";
        confirmBtn.disabled = false;
        this._showToast(err?.message || "Listing failed");
      }
    });

    // Focus price input
    setTimeout(() => priceInput.focus(), 100);
  }

  /* ── My Listings tab ───────────────────────────────────── */

  async _renderMyListings(el: HTMLElement): Promise<void> {
    try {
      const listings: any[] = await trade.myListings();

      if (!listings || listings.length === 0) {
        el.innerHTML = `<div class="trade-empty">No active listings</div>`;
        return;
      }

      el.innerHTML = listings.map((l: any) => `
        <div class="trade-listing-row" data-listing-id="${l.id}">
          <div class="trade-listing-row__icon">${TYPE_ICONS[l.itemType] || "?"}</div>
          <div class="trade-listing-row__info">
            <div class="trade-listing-row__name" style="color:${QUALITY_COLORS[l.itemQuality] || "var(--game-text)"}">${this._escapeHtml(l.itemName)}</div>
            <div class="trade-listing-row__meta">${formatGold(l.price)} gold &middot; expires ${timeAgo(l.expiresAt)}</div>
          </div>
          <button class="trade-listing-row__cancel-btn">Cancel</button>
        </div>
      `).join("");

      // Cancel click
      el.addEventListener("click", async (e: Event) => {
        const btn = (e.target as HTMLElement).closest(".trade-listing-row__cancel-btn") as HTMLElement | null;
        if (!btn) return;
        const row = btn.closest(".trade-listing-row") as HTMLElement;
        const listingId = row.dataset.listingId!;

        (btn as HTMLButtonElement).textContent = "...";
        (btn as HTMLButtonElement).disabled = true;
        try {
          await trade.cancel(listingId);
          row.remove();
          await this.state.refreshState();
          this._showToast("Listing cancelled");
          if (!el.querySelector(".trade-listing-row")) {
            el.innerHTML = `<div class="trade-empty">No active listings</div>`;
          }
        } catch (err: any) {
          (btn as HTMLButtonElement).textContent = "Cancel";
          (btn as HTMLButtonElement).disabled = false;
          this._showToast(err?.message || "Cancel failed");
        }
      });
    } catch (err) {
      console.error("[TradePanel] Load my listings failed:", err);
      el.innerHTML = `<div class="trade-empty">Failed to load listings</div>`;
    }
  }

  /* ── History tab ───────────────────────────────────────── */

  async _renderHistory(el: HTMLElement): Promise<void> {
    try {
      const history: any[] = await trade.history();

      if (!history || history.length === 0) {
        el.innerHTML = `<div class="trade-empty">No trade history</div>`;
        return;
      }

      const char = this.state.getActiveCharacter();

      el.innerHTML = history.map((l: any) => {
        const isSeller = l.sellerName === char?.nickname;
        const badgeClass = l.status === "sold"
          ? (isSeller ? "trade-badge--sell" : "trade-badge--buy")
          : "trade-badge--cancelled";
        const badgeText = l.status === "sold"
          ? (isSeller ? "SOLD" : "BOUGHT")
          : l.status.toUpperCase();

        return `
          <div class="trade-history-row">
            <span class="trade-history-badge ${badgeClass}">${badgeText}</span>
            <div class="trade-history-row__info">
              <div class="trade-history-row__name" style="color:${QUALITY_COLORS[l.itemQuality] || "var(--game-text)"}">${this._escapeHtml(l.itemName)}</div>
              <div class="trade-history-row__meta">${formatGold(l.price)} gold &middot; ${timeAgo(l.soldAt || l.createdAt)}</div>
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("[TradePanel] Load history failed:", err);
      el.innerHTML = `<div class="trade-empty">Failed to load history</div>`;
    }
  }

  /* ── Modal helpers ─────────────────────────────────────── */

  _closeModal(): void {
    if (this._modalEl) this._modalEl.classList.add("hidden");
  }

  /* ── Toast ─────────────────────────────────────────────── */

  _showToast(msg: string): void {
    if (!this._el) return;
    const existing = this._el.querySelector(".trade-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "trade-toast";
    toast.textContent = msg;
    this._el.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  /* ── Utils ─────────────────────────────────────────────── */

  _escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ── Open / Close / Destroy ────────────────────────────── */

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this._activeTab = "market";
    this._filters = { itemType: "all", quality: "all", search: "", sort: "newest" };

    // Reset tab UI
    this._el!.querySelectorAll(".trade-tab").forEach((b) => {
      b.classList.toggle("trade-tab--active", (b as HTMLElement).dataset.tab === "market");
    });

    this._renderContent();
    this._el!.classList.remove("hidden", "trade-closing");
    void this._el!.offsetHeight;
    this._el!.classList.add("trade-visible");
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._closeModal();

    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }

    this._el!.classList.remove("trade-visible");
    this._el!.classList.add("trade-closing");

    const onDone = (): void => {
      this._el!.removeEventListener("transitionend", onDone);
      this._el!.classList.remove("trade-closing");
      this._el!.classList.add("hidden");
    };
    this._el!.addEventListener("transitionend", onDone);
  }

  destroy(): void {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._el) this._el.remove();
  }
}
