import { createMonster, createMonsterForLocation, createMonsterForMap } from "./monsters.js";
import { checkLevelUp } from "./progression.js";
import { getScaledRewards } from "../data/locations.js";
import { B } from "../data/balance.js";
import type { Monster, MapConfig, Location, PlayerProxy } from "../types.js";
import type { GameState } from "./state.js";
import type { EventBus } from "./events.js";

interface QueueEntry {
  type: string;
  rarity: string;
  mapScaling?: boolean;
}

interface SyntheticLocation {
  id: string;
  name: string;
  act: number;
  order: number;
  waves: any[];
  rewards: { gold: number; xp: number };
}

export class CombatManager {
  state: GameState;
  events: EventBus;
  monster: Monster | null;
  private _deathCooldown: boolean;

  // Location-based combat
  private _location: Location | SyntheticLocation | null;
  private _actNumber: number;
  private _monsterQueue: QueueEntry[];
  private _queueIndex: number;
  private _totalMonsters: number;

  // Map-based combat (endgame)
  private _mapConfig: MapConfig | null;
  private _mapTotalGold: number;
  private _mapTotalXp: number;

  constructor(state: GameState, events: EventBus) {
    this.state = state;
    this.events = events;
    this.monster = null;
    this._deathCooldown = false;

    // Location-based combat
    this._location = null;
    this._actNumber = 1;
    this._monsterQueue = [];
    this._queueIndex = 0;
    this._totalMonsters = 0;

    // Map-based combat (endgame)
    this._mapConfig = null;
    this._mapTotalGold = 0;
    this._mapTotalXp = 0;
  }

  // ─── Legacy infinite mode (fallback) ──────────────────────

  init(): void {
    const { currentStage, currentWave } = this.state.data.combat!;
    this.monster = createMonster(currentStage, currentWave);
    this.events.emit("monsterSpawned", this.monster);
  }

  // ─── Location-based finite combat ─────────────────────────

  /**
   * Start a location — build a finite monster queue from location waves.
   */
  startLocation(location: Location): void {
    this._location = location;
    this._actNumber = location.act || 1;
    this._mapConfig = null;
    this._monsterQueue = [];
    this._queueIndex = 0;

    // Flatten waves into a single monster queue (each item = {type, rarity})
    for (const wave of location.waves) {
      for (const entry of wave.monsters) {
        for (let i = 0; i < entry.count; i++) {
          this._monsterQueue.push({ type: entry.type, rarity: entry.rarity || "common" });
        }
      }
    }

    this._totalMonsters = this._monsterQueue.length;

    this.events.emit("locationWaveProgress", {
      current: 0,
      total: this._totalMonsters,
    });

    // Spawn first monster
    this._spawnNextFromQueue();
  }

  /** true if currently in location-based combat */
  get isLocationMode(): boolean {
    return this._location !== null;
  }

  // ─── Map-based finite combat (endgame) ──────────────────────

  /**
   * Start a map encounter — build monster queue from map waves with tier scaling.
   */
  startMap(mapConfig: MapConfig): void {
    this._mapConfig = mapConfig;
    this._mapTotalGold = 0;
    this._mapTotalXp = 0;

    // Set a synthetic _location so isLocationMode returns true
    this._location = {
      id: mapConfig.isBoss ? `boss_${mapConfig.bossId}` : `map_tier_${mapConfig.tier}`,
      name: mapConfig.isBoss ? mapConfig.bossDef!.name : mapConfig.tierDef!.name,
      act: 5,
      order: 10,
      waves: mapConfig.waves,
      rewards: { gold: 0, xp: 0 },
    };
    this._actNumber = 5;
    this._monsterQueue = [];
    this._queueIndex = 0;

    // Build monster queue (same pattern as startLocation)
    for (const wave of mapConfig.waves) {
      for (const entry of wave.monsters) {
        for (let i = 0; i < entry.count; i++) {
          this._monsterQueue.push({
            type: entry.type,
            rarity: entry.rarity || "common",
            mapScaling: true,
          });
        }
      }
    }

    this._totalMonsters = this._monsterQueue.length;

    this.events.emit("locationWaveProgress", {
      current: 0,
      total: this._totalMonsters,
    });

    this._spawnNextFromQueue();
  }

  /** true if currently in map-based combat */
  get isMapMode(): boolean {
    return this._mapConfig !== null;
  }

  // ─── Tap / Passive ────────────────────────────────────────

  handleTap(): void {
    if (this._deathCooldown || !this.monster) return;

    const player = this.state.data.player!;
    const { damage, isCrit } = this._calculateDamage(player);

    this.monster.currentHp = Math.max(0, this.monster.currentHp - damage);
    this.state.data.meta.totalTaps++;

    this.events.emit("damage", { damage, isCrit, monster: this.monster });

    if (this.monster.currentHp <= 0) {
      this._onMonsterDeath();
    }

    this.state.scheduleSave();
  }

  applyPassiveDamage(): void {
    if (this._deathCooldown || !this.monster) return;

    const dps = this.state.data.player!.passiveDps;
    if (dps <= 0) return;

    this.monster.currentHp = Math.max(0, this.monster.currentHp - dps);
    this.events.emit("passiveDamage", { damage: dps, monster: this.monster });

    if (this.monster.currentHp <= 0) {
      this._onMonsterDeath();
    }

    this.state.scheduleSave();
  }

  // ─── Internal ─────────────────────────────────────────────

  private _calculateDamage(player: PlayerProxy): { damage: number; isCrit: boolean } {
    let damage = player.tapDamage;
    const isCrit = Math.random() < player.critChance;
    if (isCrit) {
      damage = Math.floor(damage * player.critMultiplier);
    }
    return { damage, isCrit };
  }

  private _onMonsterDeath(): void {
    this._deathCooldown = true;

    const player = this.state.data.player!;
    const gold = this.monster!.goldReward;
    const xp = this.monster!.xpReward;

    player.gold += gold;
    player.xp += xp;
    this.state.data.meta.totalKills++;
    this.state.data.meta.totalGold += gold;

    // Track map cumulative rewards
    if (this.isMapMode) {
      this._mapTotalGold += gold;
      this._mapTotalXp += xp;
    }

    const leveled = checkLevelUp(player);

    this.events.emit("monsterDied", { monster: this.monster, gold, xp });

    if (leveled) {
      this.events.emit("levelUp", { level: player.level });
    }

    this.events.emit("goldChanged", { gold: player.gold });
    this.events.emit("xpChanged", { xp: player.xp, xpToNext: player.xpToNext });

    // Location / Map mode — finite queue
    if (this.isLocationMode) {
      this._queueIndex++;

      this.events.emit("locationWaveProgress", {
        current: this._queueIndex,
        total: this._totalMonsters,
      });

      if (this._queueIndex >= this._totalMonsters) {
        // All monsters defeated
        setTimeout(() => {
          this._deathCooldown = false;

          if (this.isMapMode) {
            // Endgame map complete
            this.events.emit("mapComplete", {
              mapConfig: this._mapConfig,
              totalGold: this._mapTotalGold,
              totalXp: this._mapTotalXp,
            });
          } else {
            // Story location complete
            this.events.emit("locationComplete", {
              locationId: this._location!.id,
              rewards: getScaledRewards(this._location as Location),
            });
          }
        }, B.SPAWN_DELAY_MS);
      } else {
        // Spawn next monster from queue
        setTimeout(() => {
          this._spawnNextFromQueue();
          this._deathCooldown = false;
        }, B.SPAWN_DELAY_MS);
      }
    } else {
      // Legacy infinite mode
      const combat = this.state.data.combat!;
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

      setTimeout(() => {
        this.monster = createMonster(combat.currentStage, combat.currentWave);
        this._deathCooldown = false;
        this.events.emit("monsterSpawned", this.monster);
      }, B.SPAWN_DELAY_MS);
    }

    this.state.scheduleSave();
  }

  private _spawnNextFromQueue(): void {
    const entry = this._monsterQueue[this._queueIndex];

    if (entry.mapScaling && this._mapConfig) {
      // Endgame map scaling
      const mc = this._mapConfig;
      const muls = mc.isBoss ? mc.bossDef! : mc.tierDef!;
      this.monster = createMonsterForMap(
        entry.type, entry.rarity,
        muls.hpMul, muls.goldMul, muls.xpMul
      );
    } else {
      // Story location scaling
      this.monster = createMonsterForLocation(entry.type, this._location!.order, entry.rarity, this._actNumber);
    }

    this.events.emit("monsterSpawned", this.monster);
  }
}
