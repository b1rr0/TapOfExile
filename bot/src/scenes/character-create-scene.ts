import { listCharacterClasses } from "../data/character-classes.js";
import { getHeroSkin } from "../data/sprite-registry.js";
import { SpriteEngine } from "../ui/sprite-engine.js";
import { CLASS_DEFS, statsAtLevel, specialAtLevel, STAT_LABELS, RESISTANCE_LABELS, MAX_LEVEL } from "@shared/class-stats";
import { IS_TESTING } from "../config.js";
import type { SharedDeps, SkinConfig } from "../types.js";

/**
 * CharacterCreateScene - league + nickname + class selection.
 *
 * Lifecycle: mount(params) / unmount()
 */
export class CharacterCreateScene {
  container: HTMLElement;
  events: SharedDeps["events"];
  state: SharedDeps["state"];
  sceneManager: SharedDeps["sceneManager"];

  _engines: { engine: SpriteEngine; canvas: HTMLCanvasElement; skin: SkinConfig }[];
  _raf: number | null;

  _selectedClassId: string | null;
  _selectedLeagueId: string | null;

  constructor(container: HTMLElement, deps: SharedDeps) {
    this.container = container;
    this.events = deps.events;
    this.state = deps.state;
    this.sceneManager = deps.sceneManager;

    this._engines = [];     // SpriteEngine per class card
    this._raf = null;

    this._selectedClassId = null;
    this._selectedLeagueId = null;
  }

  mount(_params: Record<string, unknown> = {}): void {
    const classes = listCharacterClasses();
    const hasChars = this.state.hasCharacters();
    const leagues = this.state.data.leagues || [];

    this.container.innerHTML = `
      <div class="char-create">
        <div class="char-create__header">
          <h2 class="char-create__title">Create Hero</h2>
          ${hasChars ? `<button class="scene-close-btn" id="cc-back">&times;</button>` : ""}
        </div>

        <div class="char-create__section">
          <label class="char-create__label">Choose League</label>
          <div class="char-create__leagues" id="cc-leagues">
            ${leagues.map((l: any) => `
              <div class="league-card" data-league-id="${l.id}">
                <div class="league-card__name">${l.name}</div>
                <div class="league-card__type">${l.type === "standard" ? "Permanent" : "Monthly League"}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="char-create__section">
          <label class="char-create__label">Nickname</label>
          <input type="text" class="char-create__input" id="cc-nickname"
                 maxlength="16" placeholder="Enter name..." autocomplete="off" />
        </div>

        <div class="char-create__section">
          <label class="char-create__label">Choose Class</label>
          <div class="char-create__classes" id="cc-classes">
            ${classes.map(c => {
              const def = CLASS_DEFS[c.id];
              return `
              <div class="class-card" data-class="${c.id}">
                <button class="class-card__info-btn" data-info="${c.id}">?</button>
                <canvas class="class-card__preview" data-skin="${c.skinId}"></canvas>
                <div class="class-card__name">${c.icon} ${c.name}</div>
                <div class="class-card__desc">${c.description}</div>
                ${def ? `<div class="class-card__stats">
                  <span class="class-card__stat">${def.special.icon} ${def.special.name}</span>
                </div>` : ""}
              </div>
            `}).join("")}
          </div>
        </div>

        <button class="char-create__confirm" id="cc-confirm" disabled>Create</button>
      </div>
    `;

    // Wire back button
    const backBtn = this.container.querySelector("#cc-back") as HTMLButtonElement | null;
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.sceneManager.switchTo("characterSelect");
      });
    }

    // Wire league card clicks
    const leagueCards = this.container.querySelectorAll(".league-card") as NodeListOf<HTMLElement>;
    leagueCards.forEach(card => {
      card.addEventListener("click", () => {
        leagueCards.forEach(c => c.classList.remove("league-card--selected"));
        card.classList.add("league-card--selected");
        this._selectedLeagueId = card.dataset.leagueId ?? null;
        this._updateConfirmState();
      });
    });

    // Auto-select if only one league
    if (leagues.length === 1) {
      this._selectedLeagueId = leagues[0].id;
      leagueCards[0]?.classList.add("league-card--selected");
    }

    // Wire class card clicks
    const classCards = this.container.querySelectorAll(".class-card") as NodeListOf<HTMLElement>;
    classCards.forEach(card => {
      card.addEventListener("click", (e: MouseEvent) => {
        // Don't select if clicking the info button
        if ((e.target as HTMLElement).closest(".class-card__info-btn")) return;
        // Deselect all
        classCards.forEach(c => c.classList.remove("class-card--selected"));
        // Select this one
        card.classList.add("class-card--selected");
        this._selectedClassId = card.dataset.class ?? null;
        this._updateConfirmState();
      });
    });

    // Wire info (?) buttons
    const infoBtns = this.container.querySelectorAll(".class-card__info-btn") as NodeListOf<HTMLButtonElement>;
    infoBtns.forEach(btn => {
      btn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        const classId = (btn as HTMLElement).dataset.info!;
        this._showClassInfo(classId);
      });
    });

    // Wire nickname input
    const nicknameInput = this.container.querySelector("#cc-nickname") as HTMLInputElement;
    nicknameInput.addEventListener("input", () => this._updateConfirmState());

    // Wire confirm button
    (this.container.querySelector("#cc-confirm") as HTMLButtonElement).addEventListener("click", async () => {
      const nickname = nicknameInput.value.trim();
      if (!nickname || !this._selectedClassId || !this._selectedLeagueId) return;

      const btn = this.container.querySelector("#cc-confirm") as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = "Creating...";

      try {
        await this.state.createCharacter(nickname, this._selectedClassId, this._selectedLeagueId);
        this.sceneManager.switchTo("hideout");
      } catch (err) {
        console.error("[CharCreate] Failed to create character:", err);
        btn.disabled = false;
        btn.textContent = "Create";
      }
    });

    // Load sprite previews for class cards
    this._loadClassPreviews();
  }

  /* -- Sprite previews for class cards -------------------- */

  async _loadClassPreviews(): Promise<void> {
    const canvases = this.container.querySelectorAll(".class-card__preview") as NodeListOf<HTMLCanvasElement>;

    for (const canvas of canvases) {
      const skinId = canvas.dataset.skin!;
      const skin = getHeroSkin(skinId);
      if (!skin) continue;

      const engine = new SpriteEngine({
        basePath: skin.basePath,
        animations: { idle: skin.animations.idle },
      });

      try {
        await engine.load();
        engine.play("idle");
        this._engines.push({ engine, canvas, skin });
      } catch (err) {
        console.warn(`[CharCreate] Failed to load preview for ${skinId}`, err);
      }
    }

    // Size canvases and start tick
    this._sizeCardCanvases();
    this._startTick();
  }

  _sizeCardCanvases(): void {
    for (const { canvas } of this._engines) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
  }

  /* -- Class info popup ------------------------------------ */

  _showClassInfo(classId: string): void {
    // Remove any existing popup
    this.container.querySelector(".class-info-popup")?.remove();

    const def = CLASS_DEFS[classId];
    if (!def) return;

    const base = def.base;
    const lvlMax = statsAtLevel(classId, MAX_LEVEL);
    const special = def.special;
    const specialBase = specialAtLevel(classId, 1);
    const specialMax = specialAtLevel(classId, MAX_LEVEL);

    const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
    const fmtSpecial = (v: number) => special.format === 'percent' ? fmtPct(v) : String(Math.floor(v));

    const statRow = (icon: string, label: string, baseVal: string, maxVal: string) => {
      if (IS_TESTING) {
        return `<div class="class-info__stat-row">
          <span class="class-info__stat-icon">${icon}</span>
          <span class="class-info__stat-label">${label}</span>
          <span class="class-info__stat-val">${baseVal}</span>
          <span class="class-info__stat-arrow">&rarr;</span>
          <span class="class-info__stat-max">${maxVal}</span>
        </div>`;
      }
      return `<div class="class-info__stat-row">
        <span class="class-info__stat-icon">${icon}</span>
        <span class="class-info__stat-label">${label}</span>
        <span class="class-info__stat-val">${baseVal}</span>
      </div>`;
    };

    const resEntries = Object.entries(RESISTANCE_LABELS);
    const hasRes = resEntries.some(([key]) => (base.resistance as any)[key] > 0);

    const popup = document.createElement("div");
    popup.className = "class-info-popup";
    popup.innerHTML = `
      <div class="class-info-popup__backdrop"></div>
      <div class="class-info-popup__card">
        <div class="class-info-popup__header">
          <span class="class-info-popup__title">${def.icon} ${def.name}</span>
          <button class="class-info-popup__close">&times;</button>
        </div>
        <div class="class-info-popup__body">
          <div class="class-info__section">Base Stats${IS_TESTING ? ` <span class="class-info__sub">Lv.1 → Lv.${MAX_LEVEL}</span>` : ""}</div>
          ${statRow(STAT_LABELS.hp.icon, STAT_LABELS.hp.label, String(base.hp), String(lvlMax.hp))}
          ${statRow(STAT_LABELS.tapDamage.icon, STAT_LABELS.tapDamage.label, String(base.tapDamage), String(lvlMax.tapDamage))}
          ${statRow(STAT_LABELS.critChance.icon, STAT_LABELS.critChance.label, fmtPct(base.critChance), fmtPct(lvlMax.critChance))}
          ${statRow(STAT_LABELS.critMultiplier.icon, STAT_LABELS.critMultiplier.label, fmtPct(base.critMultiplier), fmtPct(lvlMax.critMultiplier))}
          ${statRow(STAT_LABELS.dodgeChance.icon, STAT_LABELS.dodgeChance.label, fmtPct(base.dodgeChance), fmtPct(lvlMax.dodgeChance))}

          <div class="class-info__section">Unique Ability</div>
          <div class="class-info__special">
            <span class="class-info__special-icon">${special.icon}</span>
            <div class="class-info__special-body">
              <span class="class-info__special-name">${special.name}</span>
              <span class="class-info__special-desc">${special.description}</span>
            </div>
            <span class="class-info__special-val">${IS_TESTING ? `${fmtSpecial(specialBase)} → ${fmtSpecial(specialMax)}` : fmtSpecial(specialBase)}</span>
          </div>

          ${hasRes ? `
          <div class="class-info__section">Resistances</div>
          ${resEntries.map(([key, r]) => {
            const val = (base.resistance as any)[key] || 0;
            if (val === 0) return "";
            return `<div class="class-info__res-row">
              <span class="class-info__res-dot" style="background:${r.color}"></span>
              <span class="class-info__res-label">${r.label}</span>
              <span class="class-info__res-val" style="color:${r.color}">${val}%</span>
            </div>`;
          }).join("")}
          ` : ""}
        </div>
      </div>
    `;

    const charCreate = this.container.querySelector(".char-create") as HTMLElement;
    charCreate.appendChild(popup);

    // Close handlers
    const close = () => popup.remove();
    popup.querySelector(".class-info-popup__close")!.addEventListener("click", close);
    popup.querySelector(".class-info-popup__backdrop")!.addEventListener("click", close);
  }

  /* -- Tick loop ------------------------------------------ */

  _startTick(): void {
    let last = performance.now();

    const tick = (): void => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.2);
      last = now;

      // Update small class-card canvases
      for (const { engine, canvas, skin } of this._engines) {
        engine.update(dt);
        if (engine.needsRedraw) {
          engine.needsRedraw = false;
          const ctx = canvas.getContext("2d")!;
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const frameW = skin.defaultSize.w;
          const frameH = skin.defaultSize.h;
          const scale = Math.min(h * 0.85 / frameH, w * 0.85 / frameW);
          const dw = frameW * scale;
          const dh = frameH * scale;
          const dx = (w - dw) / 2;
          const dy = h - dh - h * 0.05;
          engine.drawFrame(ctx, dx, dy, dw, dh, false);
        }
      }

      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  /* -- Confirm state -------------------------------------- */

  _updateConfirmState(): void {
    const nickname = (this.container.querySelector("#cc-nickname") as HTMLInputElement | null)?.value.trim();
    const btn = this.container.querySelector("#cc-confirm") as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = !nickname || !this._selectedClassId || !this._selectedLeagueId;
    }
  }

  /* -- Cleanup -------------------------------------------- */

  unmount(): void {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    for (const { engine } of this._engines) {
      engine.destroy();
    }
    this._engines = [];

    this._selectedClassId = null;
    this._selectedLeagueId = null;
    this.container.innerHTML = "";
  }
}
