import { formatNumber } from "../utils/format.js";

export class HUD {
  constructor(container, events) {
    this.container = container;
    this.events = events;

    this.stageEl = container.querySelector("#stage-display");
    this.levelEl = container.querySelector("#level-display");
    this.goldEl = container.querySelector("#gold-display");
    this.dpsEl = document.querySelector("#dps-display");

    this._listen();
  }

  _listen() {
    this.events.on("goldChanged", (data) => {
      this.updateGold(data.gold);
    });

    this.events.on("waveChanged", (data) => {
      this.updateStage(data.stage, data.wave);
    });

    this.events.on("levelUp", (data) => {
      this.updateLevel(data.level);
    });

    this.events.on("stateLoaded", (state) => {
      this.updateGold(state.player.gold);
      this.updateStage(state.combat.currentStage, state.combat.currentWave);
      this.updateLevel(state.player.level);
      this.updateDps(state.player.passiveDps);
    });

    this.events.on("statsRecalculated", (player) => {
      this.updateDps(player.passiveDps);
    });
  }

  updateGold(amount) {
    this.goldEl.textContent = formatNumber(amount);
    this.goldEl.classList.add("pulse");
    setTimeout(() => this.goldEl.classList.remove("pulse"), 300);
  }

  updateStage(stage, wave) {
    this.stageEl.textContent = `Stage ${stage}-${wave}`;
  }

  updateLevel(level) {
    this.levelEl.textContent = `Lv.${level}`;
  }

  updateDps(dps) {
    this.dpsEl.textContent = `DPS: ${formatNumber(dps)}`;
  }
}
