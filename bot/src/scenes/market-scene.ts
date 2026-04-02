import { api } from "../api.js";
import type { SharedDeps } from "../types.js";

/**
 * MarketScene - trade slot expansion & market upgrades.
 */
export class MarketScene {
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
          <span class="shop-scene__shards">&#x1F48E; <span id="market-shards-hdr">${this.state.data.shards || "0"}</span></span>
          <h2 class="shop-scene__title">Market</h2>
          <button class="scene-close-btn" id="market-back">&times;</button>
        </div>
        <div class="shop-scene__content" id="market-content">
          <div class="shop-scene__loading">Loading...</div>
        </div>
      </div>
    `;

    this.container.querySelector("#market-back")!.addEventListener("click", () => {
      this.sceneManager.switchTo("hideout");
    });

    await this._loadContent();
  }

  async _loadContent(): Promise<void> {
    try {
      const [balanceRes, itemsRes] = await Promise.all([
        api.shop.balance(),
        api.shop.items(),
      ]);

      const balance = balanceRes as { shards: string; extraTradeSlots: number; maxTradeSlots: number; extraBagSlots: number; maxBagSlots: number };
      const shopItems = ((itemsRes as any).items || []) as Array<{
        id: string;
        label: string;
        description: string;
        priceShards: number;
        category: string;
        metadata: Record<string, any> | null;
      }>;

      const content = this.container.querySelector("#market-content")!;
      // Update header shards from API (authoritative)
      const hdrShards = this.container.querySelector("#market-shards-hdr");
      if (hdrShards) hdrShards.textContent = balance.shards;

      content.innerHTML = `
        <!-- Market Upgrades -->
        <div class="shop-scene__section">
          <h3 class="shop-scene__section-title">Upgrades</h3>
          <div class="shop-scene__items" id="market-items">
            ${shopItems.map(item => {
              let extra = "";
              if (item.id === "trade_slots_10") {
                extra = `<span class="shop-scene__item-info" data-info="trade">${balance.maxTradeSlots} slots</span>`;
              } else if (item.id === "bag_slots_20") {
                extra = `<span class="shop-scene__item-info" data-info="bag">${balance.maxBagSlots || 52} slots</span>`;
              }
              return `
                <div class="shop-scene__item">
                  <div class="shop-scene__item-header">
                    <span class="shop-scene__item-name">${item.label}</span>
                    ${extra}
                  </div>
                  <p class="shop-scene__item-desc">${item.description}</p>
                  <button class="shop-scene__item-buy" data-shop-item="${item.id}">
                    ${item.priceShards} &#x1F48E;
                  </button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;

      this._wireEvents(balance);
    } catch (err) {
      console.error("[Market] Failed to load:", err);
      const content = this.container.querySelector("#market-content")!;
      content.innerHTML = `<div class="shop-scene__error">Failed to load market</div>`;
    }
  }

  _wireEvents(_balance: any): void {
    this.container.querySelectorAll(".shop-scene__item-buy").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (this._loading) return;
        const shopItemId = (btn as HTMLElement).dataset.shopItem!;
        await this._buyItem(shopItemId);
      });
    });
  }

  async _buyItem(shopItemId: string): Promise<void> {
    this._loading = true;
    try {
      const res = await api.shop.buyItem(shopItemId) as {
        shards: string;
        extraTradeSlots: number;
        maxTradeSlots: number;
        extraBagSlots: number;
        maxBagSlots: number;
      };

      const shardsEl = this.container.querySelector("#market-shards-hdr");
      if (shardsEl) shardsEl.textContent = res.shards;

      const tradeInfo = this.container.querySelector('[data-info="trade"]');
      if (tradeInfo) tradeInfo.textContent = `${res.maxTradeSlots} slots`;
      const bagInfo = this.container.querySelector('[data-info="bag"]');
      if (bagInfo) bagInfo.textContent = `${res.maxBagSlots} slots`;
    } catch (err: any) {
      const msg = err?.message || "Purchase failed";
      console.error("[Market] Buy failed:", msg);
      alert(msg);
    } finally {
      this._loading = false;
    }
  }

  unmount(): void {
    this._loading = false;
    this.container.innerHTML = "";
  }
}
