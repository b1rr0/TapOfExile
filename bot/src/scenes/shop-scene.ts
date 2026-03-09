import { api } from "../api.js";
import { SHOP_PRODUCTS } from "../../../shared/shop-products.js";
import type { SharedDeps } from "../types.js";

declare const Telegram: any;

/**
 * ShopScene — premium Shards shop.
 *
 * - Buy Shards packages via Telegram Stars
 * - Spend Shards on shop items (trade slots, etc.)
 * - View transaction/payment history
 */
export class ShopScene {
  container: HTMLElement;
  sceneManager: SharedDeps["sceneManager"];
  state: SharedDeps["state"];

  _loading = false;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.sceneManager = deps.sceneManager;
    this.state = deps.state;
  }

  async mount(_params: Record<string, unknown> = {}): Promise<void> {
    this.container.innerHTML = `
      <div class="shop-scene">
        <div class="shop-scene__header">
          <button class="shop-scene__back" id="shop-back">&larr;</button>
          <h2 class="shop-scene__title">Shard Shop</h2>
          <span class="shop-scene__shards">&#x1F48E; <span id="shop-shards-hdr">${this.state.data.shards || "0"}</span></span>
        </div>
        <div class="shop-scene__content" id="shop-content">
          <div class="shop-scene__loading">Loading...</div>
        </div>
      </div>
    `;

    this.container.querySelector("#shop-back")!.addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    await this._loadContent();
  }

  async _loadContent(): Promise<void> {
    try {
      const balanceRes = await api.shop.balance();

      const balance = balanceRes as { shards: string; extraTradeSlots: number; maxTradeSlots: number };

      const content = this.container.querySelector("#shop-content")!;
      // Update header shards from API (authoritative)
      const hdrShards = this.container.querySelector("#shop-shards-hdr");
      if (hdrShards) hdrShards.textContent = balance.shards;

      content.innerHTML = `
        <!-- Buy Shards -->
        <div class="shop-scene__section">
          <h3 class="shop-scene__section-title">Buy Shards</h3>
          <div class="shop-scene__packages" id="shop-packages">
            ${SHOP_PRODUCTS.map(p => `
              <button class="shop-scene__package" data-product="${p.id}">
                <span class="shop-scene__package-amount">${p.label}</span>
                <span class="shop-scene__package-price">${p.starsPrice} &#x2B50; Stars</span>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- History -->
        <div class="shop-scene__section">
          <button class="shop-scene__history-btn" id="shop-history-btn">View History</button>
          <div class="shop-scene__history-content hideout-dropdown--hidden" id="shop-history"></div>
        </div>
      `;

      this._wireEvents();
    } catch (err) {
      console.error("[Shop] Failed to load:", err);
      const content = this.container.querySelector("#shop-content")!;
      content.innerHTML = `<div class="shop-scene__error">Failed to load shop</div>`;
    }
  }

  _wireEvents(): void {
    // Buy Shards packages (Telegram Stars)
    this.container.querySelectorAll(".shop-scene__package").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (this._loading) return;
        const productId = (btn as HTMLElement).dataset.product!;
        await this._buyStars(productId);
      });
    });

    // History toggle
    const historyBtn = this.container.querySelector("#shop-history-btn");
    if (historyBtn) {
      historyBtn.addEventListener("click", () => this._toggleHistory());
    }
  }

  async _buyStars(productId: string): Promise<void> {
    this._loading = true;
    try {
      const res = await api.shop.createInvoice(productId) as { invoiceLink: string };

      if (typeof Telegram !== "undefined" && Telegram.WebApp?.openInvoice) {
        Telegram.WebApp.openInvoice(res.invoiceLink, async (status: string) => {
          if (status === "paid") {
            // Refresh balance
            await this._refreshBalance();
          }
          this._loading = false;
        });
      } else {
        console.warn("[Shop] Telegram WebApp not available, opening link directly");
        window.open(res.invoiceLink, "_blank");
        this._loading = false;
      }
    } catch (err) {
      console.error("[Shop] Failed to create invoice:", err);
      this._loading = false;
    }
  }

  async _refreshBalance(): Promise<void> {
    try {
      const res = await api.shop.balance() as {
        shards: string;
        extraTradeSlots: number;
        maxTradeSlots: number;
      };
      const shardsEl = this.container.querySelector("#shop-shards-hdr");
      if (shardsEl) shardsEl.textContent = res.shards;
    } catch (err) {
      console.error("[Shop] Failed to refresh balance:", err);
    }
  }

  async _toggleHistory(): Promise<void> {
    const historyEl = this.container.querySelector("#shop-history")!;
    if (!historyEl.classList.contains("hideout-dropdown--hidden")) {
      historyEl.classList.add("hideout-dropdown--hidden");
      return;
    }

    try {
      const [payments, transactions] = await Promise.all([
        api.shop.payments() as Promise<any[]>,
        api.shop.transactions() as Promise<any[]>,
      ]);

      historyEl.innerHTML = `
        <h4>Donations</h4>
        ${(payments as any[]).length === 0
          ? "<p>No donations yet</p>"
          : `<ul class="shop-scene__history-list">
              ${(payments as any[]).map((p: any) => `
                <li>+${p.shardsAmount} Shards (${p.starsAmount} Stars) — ${new Date(p.createdAt).toLocaleDateString()}</li>
              `).join("")}
            </ul>`
        }

        <h4>Transactions</h4>
        ${(transactions as any[]).length === 0
          ? "<p>No transactions yet</p>"
          : `<ul class="shop-scene__history-list">
              ${(transactions as any[]).map((t: any) => `
                <li>${t.amount > 0 ? "+" : ""}${t.amount} Shards — ${t.reason} — ${new Date(t.createdAt).toLocaleDateString()}</li>
              `).join("")}
            </ul>`
        }
      `;
      historyEl.classList.remove("hideout-dropdown--hidden");
    } catch (err) {
      console.error("[Shop] Failed to load history:", err);
    }
  }

  unmount(): void {
    this._loading = false;
    this.container.innerHTML = "";
  }
}
