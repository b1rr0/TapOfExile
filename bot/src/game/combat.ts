import { api } from "../api.js";
import { B } from "../data/balance.js";
import type { Monster, MapConfig, Location } from "../types.js";
import type { GameState } from "./state.js";
import type { EventBus } from "./events.js";

interface SyntheticLocation {
  id: string;
  name: string;
  act: number;
  order: number;
  waves: any[];
  rewards: { gold: number; xp: number };
}

/**
 * CombatManager — server-authoritative combat.
 *
 * All damage, rewards, and progression are calculated on the server.
 * Frontend sends taps via API, receives damage + kill info back.
 */
export class CombatManager {
  state: GameState;
  events: EventBus;
  monster: Monster | null;
  private _deathCooldown: boolean;
  private _tapping: boolean;

  // Server session
  private _sessionId: string | null;

  // Location / Map metadata for display
  private _location: Location | SyntheticLocation | null;
  private _actNumber: number;
  private _totalMonsters: number;
  private _monstersKilled: number;

  // Map-based combat (endgame)
  private _mapConfig: MapConfig | null;

  constructor(state: GameState, events: EventBus) {
    this.state = state;
    this.events = events;
    this.monster = null;
    this._deathCooldown = false;
    this._tapping = false;

    this._sessionId = null;
    this._location = null;
    this._actNumber = 1;
    this._totalMonsters = 0;
    this._monstersKilled = 0;
    this._mapConfig = null;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  // ─── Location-based finite combat ─────────────────────────

  /**
   * Start a location — call server to create combat session.
   */
  async startLocation(location: Location): Promise<void> {
    this._location = location;
    this._actNumber = location.act || 1;
    this._mapConfig = null;
    this._monstersKilled = 0;

    const result = await api.combat.startLocation(
      location.id,
      location.waves,
      location.order,
      location.act,
    );

    this._sessionId = result.sessionId;
    this._totalMonsters = result.totalMonsters;

    this.events.emit("locationWaveProgress", {
      current: 0,
      total: this._totalMonsters,
    });

    if (result.currentMonster) {
      this._setMonsterFromServer(result.currentMonster);
    }
  }

  /** true if currently in location-based combat */
  get isLocationMode(): boolean {
    return this._location !== null;
  }

  // ─── Map-based finite combat (endgame) ──────────────────────

  /**
   * Start a map encounter — server creates session and consumes key.
   */
  async startMap(mapConfig: MapConfig, mapKeyItemId: string, direction?: string): Promise<void> {
    this._mapConfig = mapConfig;

    this._location = {
      id: mapConfig.isBoss ? `boss_${mapConfig.bossId}` : `map_tier_${mapConfig.tier}`,
      name: mapConfig.isBoss ? mapConfig.bossDef!.name : mapConfig.tierDef!.name,
      act: 5,
      order: 10,
      waves: mapConfig.waves,
      rewards: { gold: 0, xp: 0 },
    };
    this._actNumber = 5;
    this._monstersKilled = 0;

    const result = await api.combat.startMap(mapKeyItemId, direction);

    this._sessionId = result.sessionId;
    this._totalMonsters = result.totalMonsters;

    this.events.emit("locationWaveProgress", {
      current: 0,
      total: this._totalMonsters,
    });

    if (result.currentMonster) {
      this._setMonsterFromServer(result.currentMonster);
    }
  }

  /** true if currently in map-based combat */
  get isMapMode(): boolean {
    return this._mapConfig !== null;
  }

  // ─── Tap / Passive ────────────────────────────────────────

  handleTap(): void {
    if (this._deathCooldown || !this.monster || !this._sessionId || this._tapping) return;
    this._tapping = true;

    api.combat
      .tap(this._sessionId)
      .then((result) => {
        this._tapping = false;
        if (!this.monster) return;

        this.monster.currentHp = result.monsterHp;

        this.events.emit("damage", {
          damage: result.damage,
          damageBreakdown: result.damageBreakdown,
          isCrit: result.isCrit,
          monster: this.monster,
        });

        if (result.killed) {
          this._onMonsterDeath(result);
        }
      })
      .catch((err) => {
        this._tapping = false;
        console.warn("[CombatManager] Tap failed:", err);
      });
  }

  applyPassiveDamage(): void {
    // Passive DPS removed — kept as no-op for interface compatibility
  }

  // ─── Complete / Flee ──────────────────────────────────────

  async complete(): Promise<any> {
    if (!this._sessionId) return null;
    const result = await api.combat.complete(this._sessionId);
    this.state.updateFromCombatComplete(result);
    this._sessionId = null;
    return result;
  }

  async flee(): Promise<void> {
    if (!this._sessionId) return;
    await api.combat.flee(this._sessionId);
    this._sessionId = null;
  }

  // ─── Internal ─────────────────────────────────────────────

  private _setMonsterFromServer(serverMonster: any): void {
    this.monster = {
      name: serverMonster.name || "Monster",
      cssClass: serverMonster.cssClass || "monster-common",
      bodyColor: serverMonster.bodyColor || "#666",
      eyeColor: serverMonster.eyeColor || "#f00",
      rarity: serverMonster.rarity || "common",
      maxHp: serverMonster.maxHp,
      currentHp: serverMonster.currentHp ?? serverMonster.maxHp,
      goldReward: serverMonster.goldReward || 0,
      xpReward: serverMonster.xpReward || 0,
      resistance: serverMonster.resistance || {},
    };
    this.events.emit("monsterSpawned", this.monster);
  }

  private _onMonsterDeath(tapResult: {
    isComplete: boolean;
    currentMonster: any;
    monstersRemaining: number;
  }): void {
    this._deathCooldown = true;
    this._monstersKilled++;

    const gold = this.monster!.goldReward;
    const xp = this.monster!.xpReward;

    this.events.emit("monsterDied", { monster: this.monster, gold, xp });

    this.events.emit("locationWaveProgress", {
      current: this._monstersKilled,
      total: this._totalMonsters,
    });

    if (tapResult.isComplete) {
      setTimeout(async () => {
        this._deathCooldown = false;
        try {
          const result = await this.complete();
          if (!result) return;

          if (this.isMapMode) {
            this.events.emit("mapComplete", {
              mapConfig: this._mapConfig,
              totalGold: result.totalGold,
              totalXp: result.totalXp,
              mapDrops: result.mapDrops || [],
            });
          } else {
            this.events.emit("locationComplete", {
              locationId: result.locationId || this._location?.id,
              rewards: { gold: result.totalGold, xp: result.totalXp },
            });
          }
        } catch (err) {
          console.error("[CombatManager] Failed to complete session:", err);
        }
      }, B.SPAWN_DELAY_MS);
    } else {
      setTimeout(() => {
        if (tapResult.currentMonster) {
          this._setMonsterFromServer(tapResult.currentMonster);
        }
        this._deathCooldown = false;
      }, B.SPAWN_DELAY_MS);
    }
  }
}
