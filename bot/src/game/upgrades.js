export class UpgradeManager {
  constructor(state, events) {
    this.state = state;
    this.events = events;
  }

  getCost(type) {
    const u = this.state.data.upgrades[type];
    return Math.floor(u.baseCost * Math.pow(u.costMultiplier, u.level));
  }

  canAfford(type) {
    return this.state.data.player.gold >= this.getCost(type);
  }

  purchase(type) {
    const cost = this.getCost(type);
    if (this.state.data.player.gold < cost) return false;

    this.state.data.player.gold -= cost;
    this.state.data.upgrades[type].level++;

    this.recalculateStats();

    this.events.emit("upgradePurchased", { type, level: this.state.data.upgrades[type].level });
    this.events.emit("goldChanged", { gold: this.state.data.player.gold });

    this.state.scheduleSave();
    return true;
  }

  recalculateStats() {
    const p = this.state.data.player;
    const u = this.state.data.upgrades;

    p.tapDamage = 1 + u.tapDamage.level;
    p.critChance = Math.min(0.5, 0.05 + u.critChance.level * 0.01);
    p.critMultiplier = 2.0 + u.critMultiplier.level * 0.1;
    p.passiveDps = u.passiveDps.level * 0.5;

    this.events.emit("statsRecalculated", p);
  }

  getInfo(type) {
    const u = this.state.data.upgrades[type];
    return {
      type,
      level: u.level,
      cost: this.getCost(type),
      canAfford: this.canAfford(type),
    };
  }
}
