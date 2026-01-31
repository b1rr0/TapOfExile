import { formatNumber } from "../utils/format.js";
import { haptic } from "../utils/haptic.js";

const UPGRADE_META = {
  tapDamage: { icon: "\u2694", label: "Tap DMG", desc: "+1 damage" },
  critChance: { icon: "\u26A1", label: "Crit %", desc: "+1% chance" },
  critMultiplier: { icon: "\uD83D\uDCA5", label: "Crit DMG", desc: "+0.1x mult" },
  passiveDps: { icon: "\u23F0", label: "Auto DPS", desc: "+0.5 DPS" },
};

export class UpgradePanel {
  constructor(container, events, upgradeManager) {
    this.container = container;
    this.events = events;
    this.upgrades = upgradeManager;
    this.listEl = container.querySelector("#upgrade-list");
    this.isOpen = false;

    this._initToggle();
    this._render();
    this._listen();
  }

  _initToggle() {
    const handle = this.container.querySelector("#upgrade-toggle");
    handle.addEventListener("click", () => {
      this.isOpen = !this.isOpen;
      this.container.classList.toggle("collapsed", !this.isOpen);
      if (this.isOpen) this._render();
    });
  }

  _listen() {
    this.events.on("goldChanged", () => this._render());
    this.events.on("upgradePurchased", () => this._render());
    this.events.on("stateLoaded", () => this._render());
  }

  _render() {
    this.listEl.innerHTML = "";

    for (const type of Object.keys(UPGRADE_META)) {
      const meta = UPGRADE_META[type];
      const info = this.upgrades.getInfo(type);

      const btn = document.createElement("button");
      btn.className = `upgrade-btn ${info.canAfford ? "" : "disabled"}`;
      btn.innerHTML = `
        <span class="upgrade-icon">${meta.icon}</span>
        <span class="upgrade-label">${meta.label}</span>
        <span class="upgrade-level">Lv.${info.level}</span>
        <span class="upgrade-cost">${formatNumber(info.cost)}g</span>
      `;

      btn.addEventListener("click", () => {
        if (this.upgrades.purchase(type)) {
          haptic("medium");
        }
      });

      this.listEl.appendChild(btn);
    }
  }
}
