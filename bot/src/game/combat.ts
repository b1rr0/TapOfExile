import { getSocket, waitForConnection } from "../combat-socket.js";
import { B } from "../data/balance.js";
import type { Socket } from "socket.io-client";
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
 * CombatManager — server-authoritative combat over WebSocket.
 *
 * All damage, rewards, and progression are calculated on the server.
 * Enemy attacks are pushed in real-time via WebSocket every 1 second.
 * Player taps are sent as WebSocket messages.
 */
export class CombatManager {
  state: GameState;
  events: EventBus;
  monster: Monster | null;
  private _deathCooldown: boolean;
  private _tapping: boolean;

  // Server session
  private _sessionId: string | null;

  // Socket.IO connection
  private _socket: Socket | null;

  // Location / Map metadata for display
  private _location: Location | SyntheticLocation | null;
  private _actNumber: number;
  private _totalMonsters: number;
  private _monstersKilled: number;

  // Map-based combat (endgame)
  private _mapConfig: MapConfig | null;

  // Player HP tracking (from server)
  private _playerHp: number;
  private _playerMaxHp: number;

  // Event handler ref for cleanup
  private _onEntranceDone: (() => void) | null = null;

  constructor(state: GameState, events: EventBus) {
    this.state = state;
    this.events = events;
    this.monster = null;
    this._deathCooldown = false;
    this._tapping = false;

    this._sessionId = null;
    this._socket = null;
    this._location = null;
    this._actNumber = 1;
    this._totalMonsters = 0;
    this._monstersKilled = 0;
    this._mapConfig = null;

    this._playerHp = 0;
    this._playerMaxHp = 0;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  // ─── Socket connection ──────────────────────────────────

  private async _connectSocket(): Promise<Socket> {
    this._socket = getSocket();
    this._setupSocketListeners();
    await waitForConnection(this._socket);
    return this._socket;
  }

  private _listenersAttached = false;

  private _setupSocketListeners(): void {
    if (!this._socket || this._listenersAttached) return;
    this._listenersAttached = true;

    // Enemy attacks pushed by server combat loop (real-time, every 1s)
    this._socket.on("combat:enemy-attack", (data: any) => {
      if (data.attacks && data.attacks.length > 0) {
        data.attacks.forEach((atk: any, i: number) => {
          setTimeout(() => {
            this.events.emit("enemyAttack", atk);
          }, i * 120);
        });
      }
      if (data.playerHp !== undefined) {
        this._playerHp = data.playerHp;
        this._playerMaxHp = data.playerMaxHp ?? this._playerMaxHp;
        this.events.emit("playerHpChanged", {
          hp: this._playerHp,
          maxHp: this._playerMaxHp,
        });
      }
      if (data.playerDead) {
        this._onPlayerDeath();
      }
    });

    // Tap result (player damage to monster)
    this._socket.on("combat:tap-result", (result: any) => {
      this._tapping = false;
      if (!this.monster) return;

      if (result.playerDead) {
        this._onPlayerDeath();
        return;
      }

      this.monster.currentHp = result.monsterHp;

      this.events.emit("damage", {
        damage: result.damage,
        damageBreakdown: result.damageBreakdown,
        isCrit: result.isCrit,
        monster: this.monster,
      });

      if (result.playerHp !== undefined) {
        this._playerHp = result.playerHp;
        this._playerMaxHp = result.playerMaxHp ?? this._playerMaxHp;
        this.events.emit("playerHpChanged", {
          hp: this._playerHp,
          maxHp: this._playerMaxHp,
        });
      }

      if (result.killed) {
        this._onMonsterDeath(result);
      }
    });

    // Player died (from server loop or tap)
    this._socket.on("combat:player-died", () => {
      this._onPlayerDeath();
    });

    // Reconnection state restore
    this._socket.on("combat:reconnected", (data: any) => {
      this._sessionId = data.sessionId;
      this._playerHp = data.playerHp;
      this._playerMaxHp = data.playerMaxHp;
      if (data.currentMonster) {
        this._setMonsterFromServer(data.currentMonster);
      }
      this.events.emit("playerHpChanged", {
        hp: this._playerHp,
        maxHp: this._playerMaxHp,
      });
    });

    // Error handling — also reset tapping flag so the player isn't stuck
    this._socket.on("combat:error", (data: any) => {
      console.warn("[CombatManager] Socket error:", data.message);
      this._tapping = false;
    });

    // Auto-reconnect: if we had a session, try to resume it
    this._socket.on("connect", () => {
      if (this._sessionId) {
        this._socket!.emit("combat:reconnect", { sessionId: this._sessionId });
      }
    });

    this._socket.on("disconnect", (reason: string) => {
      console.warn("[CombatManager] Disconnected:", reason);
    });

    // BattleScene signals entrance finished → tell server to start enemy attacks
    this._onEntranceDone = () => {
      this.signalEntranceDone();
    };
    this.events.on("entranceDone", this._onEntranceDone);
  }

  /**
   * Tell the server the entrance animation is done and enemy attacks can begin.
   */
  signalEntranceDone(): void {
    if (this._socket && this._sessionId) {
      console.log(`[CombatManager] Sending entrance-done for session=${this._sessionId}`);
      this._socket.emit("combat:entrance-done", { sessionId: this._sessionId });
    } else {
      console.warn(`[CombatManager] Cannot send entrance-done: socket=${!!this._socket}, session=${this._sessionId}`);
    }
  }

  // ─── Location-based finite combat ─────────────────────────

  async startLocation(location: Location): Promise<void> {
    this._location = location;
    this._actNumber = location.act || 1;
    this._mapConfig = null;
    this._monstersKilled = 0;

    const socket = await this._connectSocket();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Start location timeout"));
      }, 30000);

      socket.once("combat:started", (result: any) => {
        clearTimeout(timeout);

        this._sessionId = result.sessionId;
        this._totalMonsters = result.totalMonsters;
        this._playerHp = result.playerHp ?? 0;
        this._playerMaxHp = result.playerMaxHp ?? 0;

        this.events.emit("playerHpChanged", {
          hp: this._playerHp,
          maxHp: this._playerMaxHp,
        });
        this.events.emit("locationWaveProgress", {
          current: 0,
          total: this._totalMonsters,
        });

        this.events.emit("combatReady", {});

        if (result.currentMonster) {
          this._setMonsterFromServer(result.currentMonster);
        }
        resolve();
      });

      socket.once("combat:error", (err: any) => {
        clearTimeout(timeout);
        reject(new Error(err.message));
      });

      socket.emit("combat:start-location", {
        locationId: location.id,
        waves: location.waves,
        order: location.order,
        act: location.act,
      });
    });
  }

  get isLocationMode(): boolean {
    return this._location !== null;
  }

  // ─── Map-based finite combat (endgame) ──────────────────────

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

    const socket = await this._connectSocket();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Start map timeout"));
      }, 30000);

      socket.once("combat:started", (result: any) => {
        clearTimeout(timeout);

        this._sessionId = result.sessionId;
        this._totalMonsters = result.totalMonsters;
        this._playerHp = result.playerHp ?? 0;
        this._playerMaxHp = result.playerMaxHp ?? 0;

        this.events.emit("playerHpChanged", {
          hp: this._playerHp,
          maxHp: this._playerMaxHp,
        });
        this.events.emit("locationWaveProgress", {
          current: 0,
          total: this._totalMonsters,
        });

        this.events.emit("combatReady", {});

        if (result.currentMonster) {
          this._setMonsterFromServer(result.currentMonster);
        }
        resolve();
      });

      socket.once("combat:error", (err: any) => {
        clearTimeout(timeout);
        reject(new Error(err.message));
      });

      socket.emit("combat:start-map", { mapKeyItemId, direction });
    });
  }

  get isMapMode(): boolean {
    return this._mapConfig !== null;
  }

  // ─── Tap ────────────────────────────────────────────────────

  handleTap(): void {
    if (this._deathCooldown || !this.monster || !this._sessionId || this._tapping || !this._socket) return;
    this._tapping = true;

    this._socket.emit("combat:tap", { sessionId: this._sessionId });

    // Fallback: reset tapping flag after 2s if no response
    setTimeout(() => {
      this._tapping = false;
    }, 2000);
  }

  // ─── Complete / Flee ──────────────────────────────────────

  async complete(): Promise<any> {
    if (!this._sessionId || !this._socket) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 10000);

      this._socket!.once("combat:completed", (result: any) => {
        clearTimeout(timeout);
        this.state.updateFromCombatComplete(result);
        this._sessionId = null;
        resolve(result);
      });

      this._socket!.emit("combat:complete", { sessionId: this._sessionId });
    });
  }

  async flee(): Promise<void> {
    if (!this._sessionId || !this._socket) return;

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this._sessionId = null;
        resolve();
      }, 5000);

      this._socket!.once("combat:fled", () => {
        clearTimeout(timeout);
        this._sessionId = null;
        resolve();
      });

      this._socket!.emit("combat:flee", { sessionId: this._sessionId });
    });
  }

  // ─── Player HP ───────────────────────────────────────────

  get playerHp(): number { return this._playerHp; }
  get playerMaxHp(): number { return this._playerMaxHp; }

  private _playerDead = false;

  private _onPlayerDeath(): void {
    // Guard against double-fire (both combat:enemy-attack and combat:player-died can call this)
    if (this._playerDead) return;
    this._playerDead = true;
    this.events.emit("playerDied", {});
    // Server handles death automatically (via the combat loop or tap handler)
    this._sessionId = null;
  }

  // ─── Cleanup ─────────────────────────────────────────────

  /**
   * Remove all socket event listeners to prevent leaks.
   * Called by CombatScene on unmount.
   */
  cleanup(): void {
    if (this._onEntranceDone) {
      this.events.off("entranceDone", this._onEntranceDone);
      this._onEntranceDone = null;
    }
    if (this._socket) {
      this._socket.off("combat:enemy-attack");
      this._socket.off("combat:tap-result");
      this._socket.off("combat:player-died");
      this._socket.off("combat:reconnected");
      this._socket.off("combat:error");
      this._socket.off("combat:started");
      this._socket.off("combat:completed");
      this._socket.off("combat:fled");
      this._socket.off("connect");
      this._socket.off("disconnect");
    }
    // Keep socket alive — next combat reuses it instantly
    this._socket = null;
    this._sessionId = null;
    this._listenersAttached = false;
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
