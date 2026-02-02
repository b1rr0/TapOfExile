/**
 * ChestPanel — bag overlay with 4×8 item grid + sorting.
 *
 * Available only from the hideout. Shows collected items with
 * sort controls: quality, level, newest.
 *
 * Slot layout: 4 columns × 8 rows = 32 cells.
 * Empty cells are dim placeholders.
 * Filled cells show item icon + quality border color + level badge.
 */

/** Quality tier order for sorting (higher = better). */
const QUALITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Quality display colours. */
const QUALITY_COLORS = {
  common:    { label: "Common",    color: "#9e9e9e" },
  rare:      { label: "Rare",      color: "#4fc3f7" },
  epic:      { label: "Epic",      color: "#ffd740" },
  legendary: { label: "Legendary", color: "#ff9100" },
};

const GRID_COLS = 4;
const GRID_ROWS = 8;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

export class ChestPanel {
  /**
   * @param {HTMLElement} container — parent element (hideout root)
   * @param {Object} events — EventBus
   * @param {Object} state — GameState instance
   */
  constructor(container, events, state) {
    this.container = container;
    this.events = events;
    this.state = state;
    this.isOpen = false;
    this._el = null;
    this._sortMode = "newest"; // "quality" | "level" | "newest"

    this._createPanel();
  }

  /* ── Panel creation ────────────────────────────────────── */

  _createPanel() {
    this._el = document.createElement("div");
    this._el.className = "bag-overlay hidden";
    this._el.id = "bag-overlay";

    this._el.innerHTML = `
      <div class="bag-panel">
        <button class="bag-close-btn" id="bag-close">&times;</button>

        <h2 class="bag-title">Chest</h2>

        <!-- Sort buttons -->
        <div class="bag-sort-row">
          <button class="bag-sort-btn" data-sort="quality">Quality</button>
          <button class="bag-sort-btn" data-sort="level">Level</button>
          <button class="bag-sort-btn bag-sort-btn--active" data-sort="newest">Newest</button>
        </div>

        <!-- 4×8 item grid -->
        <div class="bag-grid" id="bag-grid"></div>
      </div>
    `;

    this.container.appendChild(this._el);

    // Close button
    this._el.querySelector("#bag-close").addEventListener("click", () => {
      this.close();
    });

    // Close on backdrop click
    this._el.addEventListener("click", (e) => {
      if (e.target === this._el) this.close();
    });

    // Sort buttons
    this._el.querySelector(".bag-sort-row").addEventListener("click", (e) => {
      const btn = e.target.closest(".bag-sort-btn");
      if (!btn) return;

      const mode = btn.dataset.sort;
      if (mode === this._sortMode) return;

      this._sortMode = mode;

      // Update active state
      this._el.querySelectorAll(".bag-sort-btn").forEach((b) => {
        b.classList.toggle("bag-sort-btn--active", b.dataset.sort === mode);
      });

      this._renderGrid();
    });
  }

  /* ── Grid rendering ────────────────────────────────────── */

  _renderGrid() {
    const gridEl = this._el.querySelector("#bag-grid");
    if (!gridEl) return;

    const char = this.state.getActiveCharacter();
    const items = char && Array.isArray(char.bag) ? [...char.bag] : [];

    // Sort
    this._sortItems(items);

    // Build cells
    let html = "";
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (i < items.length) {
        const item = items[i];
        const quality = item.quality || "common";
        html += `
          <div class="bag-cell bag-cell--${quality}" data-idx="${i}">
            <div class="bag-cell__icon">${item.icon || "?"}</div>
            <div class="bag-cell__level">Lv.${item.level || 1}</div>
          </div>
        `;
      } else {
        html += `<div class="bag-cell bag-cell--empty"></div>`;
      }
    }

    gridEl.innerHTML = html;
  }

  _sortItems(items) {
    switch (this._sortMode) {
      case "quality":
        items.sort((a, b) => {
          const qa = QUALITY_ORDER[a.quality] || 0;
          const qb = QUALITY_ORDER[b.quality] || 0;
          return qb - qa; // highest quality first
        });
        break;
      case "level":
        items.sort((a, b) => (b.level || 0) - (a.level || 0)); // highest level first
        break;
      case "newest":
      default:
        items.sort((a, b) => (b.acquiredAt || 0) - (a.acquiredAt || 0)); // newest first
        break;
    }
  }

  /* ── Open / Close ──────────────────────────────────────── */

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    this._renderGrid();

    this._el.classList.remove("hidden", "bag-closing");
    void this._el.offsetHeight;
    this._el.classList.add("bag-visible");

    this.events.emit("chestOpened");
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    this._el.classList.remove("bag-visible");
    this._el.classList.add("bag-closing");

    const onDone = () => {
      this._el.removeEventListener("transitionend", onDone);
      this._el.classList.remove("bag-closing");
      this._el.classList.add("hidden");
    };
    this._el.addEventListener("transitionend", onDone);

    this.events.emit("chestClosed");
  }

  destroy() {
    if (this._el) this._el.remove();
  }
}
