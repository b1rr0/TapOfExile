/**
 * FriendsPanel — fullscreen overlay with 3 tabs:
 *  1. Friends list (accepted) — tap to view profile + equipment
 *  2. Requests (incoming pending) — accept / reject
 *  3. Search — find characters by nickname, send request
 */

import { friends } from "../api.js";
import { getCharacterClass } from "../data/character-classes.js";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface GameState {
  getActiveCharacter(): { id: string; [k: string]: any } | null;
  refreshState(): Promise<void>;
}

type TabType = "friends" | "requests" | "search";

export class FriendsPanel {
  container: HTMLElement;
  events: EventBus;
  state: GameState;
  isOpen: boolean;
  _el: HTMLElement | null;
  _activeTab: TabType;
  _searchTimer: ReturnType<typeof setTimeout> | null;
  _profileEl: HTMLElement | null;

  constructor(container: HTMLElement, events: EventBus, state: GameState) {
    this.container = container;
    this.events = events;
    this.state = state;
    this.isOpen = false;
    this._el = null;
    this._activeTab = "friends";
    this._searchTimer = null;
    this._profileEl = null;

    this._createPanel();
  }

  /* ── Panel creation ────────────────────────────────────── */

  _createPanel(): void {
    this._el = document.createElement("div");
    this._el.className = "friends-overlay hidden";

    this._el.innerHTML = `
      <div class="friends-panel">
        <button class="friends-close-btn" id="friends-close">&times;</button>
        <h2 class="friends-title">Friends</h2>

        <div class="friends-tabs" id="friends-tabs">
          <button class="friends-tab friends-tab--active" data-tab="friends">Friends</button>
          <button class="friends-tab" data-tab="requests">Requests</button>
          <button class="friends-tab" data-tab="search">Search</button>
        </div>

        <div class="friends-content" id="friends-content"></div>
      </div>

      <div class="friends-profile-overlay hidden" id="friends-profile-overlay">
        <div class="friends-profile-backdrop"></div>
        <div class="friends-profile-panel" id="friends-profile-panel"></div>
      </div>
    `;

    this.container.appendChild(this._el);
    this._profileEl = this._el.querySelector("#friends-profile-overlay");

    // Close button
    this._el.querySelector("#friends-close")!.addEventListener("click", () => this.close());

    // Close on backdrop
    this._el.addEventListener("click", (e: MouseEvent) => {
      if (e.target === this._el) this.close();
    });

    // Profile backdrop close
    this._profileEl!.querySelector(".friends-profile-backdrop")!
      .addEventListener("click", () => this._closeProfile());

    // Tab clicks
    this._el.querySelector("#friends-tabs")!.addEventListener("click", (e: Event) => {
      const btn = (e.target as HTMLElement).closest(".friends-tab") as HTMLElement | null;
      if (!btn) return;
      const tab = btn.dataset.tab as TabType;
      if (tab === this._activeTab) return;
      this._activeTab = tab;
      this._el!.querySelectorAll(".friends-tab").forEach((b) => {
        b.classList.toggle("friends-tab--active", (b as HTMLElement).dataset.tab === tab);
      });
      this._renderContent();
    });
  }

  /* ── Content rendering ────────────────────────────────── */

  async _renderContent(): Promise<void> {
    const contentEl = this._el!.querySelector("#friends-content")!;
    const char = this.state.getActiveCharacter();
    if (!char) {
      contentEl.innerHTML = `<div class="friends-empty">No active character</div>`;
      return;
    }

    contentEl.innerHTML = `<div class="friends-loading">Loading...</div>`;

    switch (this._activeTab) {
      case "friends":
        await this._renderFriendsList(contentEl as HTMLElement, char.id);
        break;
      case "requests":
        await this._renderRequests(contentEl as HTMLElement, char.id);
        break;
      case "search":
        this._renderSearch(contentEl as HTMLElement, char.id);
        break;
    }
  }

  /* ── Friends list tab ──────────────────────────────────── */

  async _renderFriendsList(el: HTMLElement, charId: string): Promise<void> {
    try {
      const data = await friends.list(charId);
      const list: any[] = Array.isArray(data) ? data : [];

      if (list.length === 0) {
        el.innerHTML = `<div class="friends-empty">No friends yet. Search and add some!</div>`;
        return;
      }

      el.innerHTML = list.map((f: any) => {
        const c = f.character;
        const cls = getCharacterClass(c.classId);
        const tgTag = c.telegramUsername ? `<span class="friends-item__tg">@${c.telegramUsername}</span>` : "";
        const statusHtml = f.isOnline
          ? `<span class="friends-item__status friends-item__status--online">online</span>`
          : `<span class="friends-item__status friends-item__status--offline">offline${f.lastSeenAt ? " " + this._formatLastSeen(f.lastSeenAt) : ""}</span>`;
        return `
          <div class="friends-item" data-char-id="${c.id}" data-friendship-id="${f.friendshipId}">
            <span class="friends-item__icon">${cls?.icon || "?"}</span>
            <div class="friends-item__info">
              <span class="friends-item__name">${c.nickname} ${statusHtml}</span>
              <span class="friends-item__meta">${cls?.name || c.classId} &middot; Lv.${c.level}${tgTag ? " &middot; " + tgTag : ""}</span>
            </div>
            <div class="friends-item__actions">
              <button class="friends-item__action-btn friends-item__action-btn--chat" data-action="chat" title="Chat">&#x1F4AC;</button>
              <button class="friends-item__action-btn friends-item__action-btn--trade" data-action="trade" title="Trade">&#x1F91D;</button>
            </div>
          </div>
        `;
      }).join("");

      // Click handlers
      el.addEventListener("click", (e: Event) => {
        // Action buttons (chat / trade) — coming soon
        const actionBtn = (e.target as HTMLElement).closest(".friends-item__action-btn") as HTMLElement | null;
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          if (action === "chat" || action === "trade") {
            this._showToast(action === "chat" ? "Chat coming soon!" : "Trade coming soon!");
          }
          return;
        }

        // Tap on row → view profile
        const item = (e.target as HTMLElement).closest(".friends-item") as HTMLElement | null;
        if (!item) return;
        const friendCharId = item.dataset.charId!;
        const friendshipId = item.dataset.friendshipId!;
        this._openProfile(charId, friendCharId, friendshipId);
      });
    } catch (err) {
      console.error("[FriendsPanel] Load friends failed:", err);
      el.innerHTML = `<div class="friends-empty">Failed to load friends</div>`;
    }
  }

  /* ── Requests tab ──────────────────────────────────────── */

  async _renderRequests(el: HTMLElement, charId: string): Promise<void> {
    try {
      const data = await friends.getIncoming(charId);
      const list: any[] = Array.isArray(data) ? data : [];

      if (list.length === 0) {
        el.innerHTML = `<div class="friends-empty">No pending requests</div>`;
        return;
      }

      el.innerHTML = list.map((r: any) => {
        const c = r.character;
        const cls = getCharacterClass(c.classId);
        const tgTag = c.telegramUsername ? `<span class="friends-item__tg">@${c.telegramUsername}</span>` : "";
        return `
          <div class="friends-request" data-friendship-id="${r.friendshipId}">
            <span class="friends-request__icon">${cls?.icon || "?"}</span>
            <div class="friends-request__info">
              <span class="friends-request__name">${c.nickname}</span>
              <span class="friends-request__meta">${cls?.name || c.classId} &middot; Lv.${c.level}${tgTag ? " &middot; " + tgTag : ""}</span>
            </div>
            <div class="friends-request__actions">
              <button class="friends-request__btn friends-request__btn--accept" data-action="accept">Accept</button>
              <button class="friends-request__btn friends-request__btn--reject" data-action="reject">Reject</button>
            </div>
          </div>
        `;
      }).join("");

      el.addEventListener("click", async (e: Event) => {
        const btn = (e.target as HTMLElement).closest(".friends-request__btn") as HTMLElement | null;
        if (!btn) return;
        const row = btn.closest(".friends-request") as HTMLElement;
        const friendshipId = row.dataset.friendshipId!;
        const accept = btn.dataset.action === "accept";

        btn.textContent = "...";
        try {
          await friends.respond(friendshipId, accept);
          row.remove();
          // Check if list is now empty
          if (!el.querySelector(".friends-request")) {
            el.innerHTML = `<div class="friends-empty">No pending requests</div>`;
          }
        } catch (err) {
          console.error("[FriendsPanel] Respond failed:", err);
          btn.textContent = accept ? "Accept" : "Reject";
        }
      });
    } catch (err) {
      console.error("[FriendsPanel] Load requests failed:", err);
      el.innerHTML = `<div class="friends-empty">Failed to load requests</div>`;
    }
  }

  /* ── Search tab ────────────────────────────────────────── */

  _renderSearch(el: HTMLElement, charId: string): void {
    el.innerHTML = `
      <div class="friends-search">
        <input class="friends-search__input" type="text" placeholder="Search by nickname..." maxlength="64" id="friends-search-input">
        <div class="friends-search__results" id="friends-search-results"></div>
      </div>
    `;

    const input = el.querySelector("#friends-search-input") as HTMLInputElement;
    const resultsEl = el.querySelector("#friends-search-results") as HTMLElement;

    input.addEventListener("input", () => {
      if (this._searchTimer) clearTimeout(this._searchTimer);
      const query = input.value.trim();
      if (query.length < 2) {
        resultsEl.innerHTML = `<div class="friends-empty">Type at least 2 characters</div>`;
        return;
      }
      this._searchTimer = setTimeout(() => {
        this._doSearch(query, resultsEl, charId);
      }, 300);
    });

    // Focus input
    setTimeout(() => input.focus(), 100);
  }

  async _doSearch(query: string, resultsEl: HTMLElement, charId: string): Promise<void> {
    resultsEl.innerHTML = `<div class="friends-loading">Searching...</div>`;

    try {
      const results: any[] = await friends.search(query);

      if (results.length === 0) {
        resultsEl.innerHTML = `<div class="friends-empty">No characters found</div>`;
        return;
      }

      resultsEl.innerHTML = results.map((c: any) => {
        const cls = getCharacterClass(c.classId);
        const tgTag = c.telegramUsername ? `<span class="friends-item__tg">@${c.telegramUsername}</span>` : "";
        return `
          <div class="friends-search-item" data-char-id="${c.id}">
            <span class="friends-search-item__icon">${cls?.icon || "?"}</span>
            <div class="friends-search-item__info">
              <span class="friends-search-item__name">${c.nickname}</span>
              <span class="friends-search-item__meta">${cls?.name || c.classId} &middot; Lv.${c.level}${tgTag ? " &middot; " + tgTag : ""}</span>
            </div>
            <button class="friends-search-item__add-btn">Add</button>
          </div>
        `;
      }).join("");

      resultsEl.addEventListener("click", async (e: Event) => {
        const btn = (e.target as HTMLElement).closest(".friends-search-item__add-btn") as HTMLElement | null;
        if (!btn) return;
        const row = btn.closest(".friends-search-item") as HTMLElement;
        const toCharId = row.dataset.charId!;

        btn.textContent = "...";
        (btn as HTMLButtonElement).disabled = true;
        try {
          await friends.sendRequest(charId, toCharId);
          btn.textContent = "Sent!";
          btn.classList.add("friends-search-item__add-btn--sent");
        } catch (err: any) {
          const msg = err?.message || "Error";
          btn.textContent = msg.includes("already") ? "Already" : "Error";
        }
      });
    } catch (err) {
      console.error("[FriendsPanel] Search failed:", err);
      resultsEl.innerHTML = `<div class="friends-empty">Search failed</div>`;
    }
  }

  /* ── Friend profile overlay ────────────────────────────── */

  async _openProfile(myCharId: string, friendCharId: string, friendshipId: string): Promise<void> {
    if (!this._profileEl) return;
    const panel = this._profileEl.querySelector("#friends-profile-panel")!;

    panel.innerHTML = `<div class="friends-loading">Loading...</div>`;
    this._profileEl.classList.remove("hidden");

    try {
      const data = await friends.getEquipment(friendCharId, myCharId);
      const c = data.character;
      const cls = getCharacterClass(c.classId);
      const equip: any[] = data.equipment || [];

      const tgTag = c.telegramUsername ? `<div class="friends-profile__tg">@${c.telegramUsername}</div>` : "";

      panel.innerHTML = `
        <button class="friends-profile__close" id="friends-profile-close">&times;</button>
        <div class="friends-profile__header">
          <span class="friends-profile__icon">${cls?.icon || "?"}</span>
          <div class="friends-profile__name">${c.nickname}</div>
          <div class="friends-profile__meta">${cls?.name || c.classId} &middot; Lv.${c.level}</div>
          ${tgTag}
        </div>

        <div class="friends-profile__section-title">Stats</div>
        <div class="friends-profile__stats">
          <div class="friends-profile__stat">HP: ${c.maxHp}</div>
          <div class="friends-profile__stat">Damage: ${c.tapDamage}</div>
          <div class="friends-profile__stat">Crit: ${Math.round((c.critChance || 0) * 100)}%</div>
          <div class="friends-profile__stat">Crit Dmg: ${Math.round((c.critMultiplier || 1) * 100)}%</div>
          <div class="friends-profile__stat">Dodge: ${Math.round((c.dodgeChance || 0) * 100)}%</div>
          <div class="friends-profile__stat">Dojo Best: ${c.dojoBestDamage > 0 ? this._formatDmg(c.dojoBestDamage) : "---"}</div>
        </div>

        <div class="friends-profile__section-title">Equipment</div>
        <div class="friends-profile__equip">
          ${equip.length > 0
            ? equip.map((s: any) => {
                if (!s.item) return "";
                return `
                  <div class="friends-profile__equip-slot">
                    <span class="friends-profile__equip-slot-name">${s.slotId}</span>
                    <span class="friends-profile__equip-item">${s.item.name} (${s.item.quality})</span>
                  </div>
                `;
              }).join("")
            : `<div class="friends-empty">No equipment</div>`
          }
        </div>

        <button class="friends-profile__remove-btn" id="friends-profile-remove">Remove Friend</button>
      `;

      panel.querySelector("#friends-profile-close")!
        .addEventListener("click", () => this._closeProfile());

      panel.querySelector("#friends-profile-remove")!
        .addEventListener("click", async () => {
          try {
            await friends.remove(friendshipId);
            this._closeProfile();
            // Refresh friends list
            this._renderContent();
          } catch (err) {
            console.error("[FriendsPanel] Remove failed:", err);
          }
        });
    } catch (err) {
      console.error("[FriendsPanel] Load profile failed:", err);
      panel.innerHTML = `
        <button class="friends-profile__close" id="friends-profile-close">&times;</button>
        <div class="friends-empty">Failed to load profile</div>
      `;
      panel.querySelector("#friends-profile-close")!
        .addEventListener("click", () => this._closeProfile());
    }
  }

  _closeProfile(): void {
    if (this._profileEl) this._profileEl.classList.add("hidden");
  }

  _showToast(msg: string): void {
    if (!this._el) return;
    const existing = this._el.querySelector(".friends-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "friends-toast";
    toast.textContent = msg;
    this._el.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  /* ── Utils ─────────────────────────────────────────────── */

  _formatDmg(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  _formatLastSeen(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return `${weeks} week${weeks === 1 ? "" : "s"}`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  /* ── Open / Close / Destroy ────────────────────────────── */

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this._activeTab = "friends";

    // Reset tab UI
    this._el!.querySelectorAll(".friends-tab").forEach((b) => {
      b.classList.toggle("friends-tab--active", (b as HTMLElement).dataset.tab === "friends");
    });

    this._renderContent();
    this._el!.classList.remove("hidden", "friends-closing");
    void this._el!.offsetHeight;
    this._el!.classList.add("friends-visible");
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._closeProfile();

    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }

    this._el!.classList.remove("friends-visible");
    this._el!.classList.add("friends-closing");

    const onDone = (): void => {
      this._el!.removeEventListener("transitionend", onDone);
      this._el!.classList.remove("friends-closing");
      this._el!.classList.add("hidden");
    };
    this._el!.addEventListener("transitionend", onDone);
  }

  destroy(): void {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._el) this._el.remove();
  }
}
