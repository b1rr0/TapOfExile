import { formatNumber } from "../utils/format.js";
import type { GameData } from "../types.js";

interface EventBus {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, data?: unknown): void;
}

interface WaveChangedData {
  stage: number;
  wave: number;
}

interface LevelUpData {
  level: number;
}

interface XpChangedData {
  xp: number;
  xpToNext: number;
}

export class HUD {
  container: HTMLElement;
  events: EventBus;

  stageEl: HTMLElement | null;
  levelEl: HTMLElement | null;
  dpsEl: HTMLElement | null;
  xpFillEl: HTMLElement | null;
  xpTextEl: HTMLElement | null;

  _fixedLabel: string;

  constructor(container: HTMLElement, events: EventBus) {
    this.container = container;
    this.events = events;

    this.stageEl = container.querySelector("#stage-display");
    this.levelEl = document.querySelector("#level-display");
    this.dpsEl = document.querySelector("#dps-display");
    this.xpFillEl = document.querySelector("#xp-bar-fill");
    this.xpTextEl = document.querySelector("#xp-bar-text");

    // If the stage display already has text (location name), keep it
    this._fixedLabel = this.stageEl ? this.stageEl.textContent!.trim() : "";

    this._listen();
  }

  _listen(): void {
    this.events.on("waveChanged", (data: WaveChangedData) => {
      // In location mode the label is set once (room name + level) — don't overwrite
      if (!this._fixedLabel) {
        this.updateStage(data.stage, data.wave);
      }
    });

    this.events.on("levelUp", (data: LevelUpData) => {
      this.updateLevel(data.level);
    });

    this.events.on("xpChanged", (data: XpChangedData) => {
      this.updateXp(data.xp, data.xpToNext);
    });

    this.events.on("stateLoaded", (state: GameData) => {
      if (!this._fixedLabel) {
        this.updateStage(state.combat!.currentStage, state.combat!.currentWave);
      }
      this.updateLevel(state.player!.level);
      this.updateDps(state.player!.passiveDps);
      this.updateXp(state.player!.xp, state.player!.xpToNext);
    });
  }

  updateStage(stage: number, wave: number): void {
    if (this.stageEl) this.stageEl.textContent = `Stage ${stage}-${wave}`;
  }

  updateLevel(level: number): void {
    if (this.levelEl) this.levelEl.textContent = `Lv.${level}`;
  }

  updateDps(dps: number): void {
    if (this.dpsEl) this.dpsEl.textContent = `DPS: ${formatNumber(dps)}`;
  }

  updateXp(xp: number, xpToNext: number): void {
    const pct = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;
    if (this.xpFillEl) this.xpFillEl.style.width = pct + "%";
    if (this.xpTextEl) this.xpTextEl.textContent = `${xp} / ${xpToNext}`;
  }
}
