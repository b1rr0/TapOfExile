import { createMonster } from "./monsters.js";
import { checkLevelUp } from "./progression.js";

export class CombatManager {
  constructor(state, events) {
    this.state = state;
    this.events = events;
    this.monster = null;
    this._deathCooldown = false;
  }

  init() {
    const { currentStage, currentWave } = this.state.data.combat;
    this.monster = createMonster(currentStage, currentWave);
    this.events.emit("monsterSpawned", this.monster);
  }

  handleTap() {
    if (this._deathCooldown || !this.monster) return;

    const player = this.state.data.player;
    const { damage, isCrit } = this._calculateDamage(player);

    this.monster.currentHp = Math.max(0, this.monster.currentHp - damage);
    this.state.data.meta.totalTaps++;

    this.events.emit("damage", { damage, isCrit, monster: this.monster });

    if (this.monster.currentHp <= 0) {
      this._onMonsterDeath();
    }

    this.state.scheduleSave();
  }

  applyPassiveDamage() {
    if (this._deathCooldown || !this.monster) return;

    const dps = this.state.data.player.passiveDps;
    if (dps <= 0) return;

    this.monster.currentHp = Math.max(0, this.monster.currentHp - dps);
    this.events.emit("passiveDamage", { damage: dps, monster: this.monster });

    if (this.monster.currentHp <= 0) {
      this._onMonsterDeath();
    }

    this.state.scheduleSave();
  }

  _calculateDamage(player) {
    let damage = player.tapDamage;
    const isCrit = Math.random() < player.critChance;
    if (isCrit) {
      damage = Math.floor(damage * player.critMultiplier);
    }
    return { damage, isCrit };
  }

  _onMonsterDeath() {
    this._deathCooldown = true;

    const player = this.state.data.player;
    const combat = this.state.data.combat;
    const gold = this.monster.goldReward;
    const xp = this.monster.xpReward;

    player.gold += gold;
    player.xp += xp;
    this.state.data.meta.totalKills++;
    this.state.data.meta.totalGold += gold;

    const leveled = checkLevelUp(player);

    this.events.emit("monsterDied", { monster: this.monster, gold, xp });

    if (leveled) {
      this.events.emit("levelUp", { level: player.level });
    }

    this.events.emit("goldChanged", { gold: player.gold });

    // Advance wave/stage
    combat.currentWave++;
    if (combat.currentWave > combat.wavesPerStage) {
      combat.currentWave = 1;
      combat.currentStage++;
      this.events.emit("stageAdvanced", { stage: combat.currentStage });
    }

    this.events.emit("waveChanged", {
      stage: combat.currentStage,
      wave: combat.currentWave,
    });

    // Spawn next monster after death animation completes
    setTimeout(() => {
      this.monster = createMonster(combat.currentStage, combat.currentWave);
      this._deathCooldown = false;
      this.events.emit("monsterSpawned", this.monster);
    }, 1200);

    this.state.scheduleSave();
  }
}
