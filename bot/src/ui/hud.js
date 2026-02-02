import { formatNumber } from "../utils/format.js";

export class HUD {
  constructor(container, events) {
    this.container = container;
    this.events = events;

    this.stageEl = container.querySelector("#stage-display");
    this.levelEl = document.querySelector("#level-display");
    this.dpsEl = document.querySelector("#dps-display");
    this.xpFillEl = document.querySelector("#xp-bar-fill");
    this.xpTextEl = document.querySelector("#xp-bar-text");

    // If the stage display already has text (location name), keep it
    this._fixedLabel = this.stageEl ? this.stageEl.textContent.trim() : "";

    this._listen();
  }

  _listen() {
    this.events.on("waveChanged", (data) => {
      // In location mode the label is set once (room name + level) — don't overwrite
      if (!this._fixedLabel) {
        this.updateStage(data.stage, data.wave);
      }
    });

    this.events.on("levelUp", (data) => {
      this.updateLevel(data.level);
    });

    this.events.on("xpChanged", (data) => {
      this.updateXp(data.xp, data.xpToNext);
    });

    this.events.on("stateLoaded", (state) => {
      if (!this._fixedLabel) {
        this.updateStage(state.combat.currentStage, state.combat.currentWave);
      }
      this.updateLevel(state.player.level);
      this.updateDps(state.player.passiveDps);
      this.updateXp(state.player.xp, state.player.xpToNext);
    });
  }

  updateStage(stage, wave) {
    if (this.stageEl) this.stageEl.textContent = `Stage ${stage}-${wave}`;
  }

  updateLevel(level) {
    if (this.levelEl) this.levelEl.textContent = `Lv.${level}`;
  }

  updateDps(dps) {
    if (this.dpsEl) this.dpsEl.textContent = `DPS: ${formatNumber(dps)}`;
  }

  updateXp(xp, xpToNext) {
    const pct = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;
    if (this.xpFillEl) this.xpFillEl.style.width = pct + "%";
    if (this.xpTextEl) this.xpTextEl.textContent = `${xp} / ${xpToNext}`;
  }
}
