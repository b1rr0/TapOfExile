import { B } from "../data/balance.js";
import { api } from "../api.js";
import type { GameData, Character, PlayerProxy, BagItem, LeagueInfo } from "../types.js";
import type { EventBus } from "./events.js";

/* ── Default in-memory state ───────────────────────────── */

function createDefault(): GameData {
  return {
    gold: 0,
    activeCharacterId: null,
    characters: [],
    leagues: [],
    meta: {
      lastSaveTime: Date.now(),
      totalTaps: 0,
      totalKills: 0,
      totalGold: 0,
      version: 4,
    },
  };
}

/* ── GameState (server-backed) ────────────────────────── */

export class GameState {
  events: EventBus;
  data: GameData;
  private _playerProxy: PlayerProxy | null;

  /** Bag items (per-league, shared across characters) */
  bag: BagItem[];

  constructor(events: EventBus) {
    this.events = events;
    this.data = createDefault();
    this._playerProxy = null;
    this.bag = [];
  }

  /* ── Load from server ────────────────────────────────── */

  /**
   * Authenticate via Telegram, join league if needed, load full state.
   */
  async load(): Promise<void> {
    const tg = (window as any).Telegram?.WebApp;
    const initData: string | null = tg?.initData || null;

    if (!initData) {
      console.warn("[GameState] No Telegram initData — cannot authenticate");
      throw new Error("Telegram initData required");
    }

    // 1. Authenticate
    const authResult = await api.auth.login(initData);

    // 2. Load available leagues
    const { leagues: leagueList } = await api.leagues.list();
    this.data.leagues = leagueList.map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      status: l.status,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
    }));

    // 3. If no active league, join standard league
    if (!authResult.player.activeLeagueId) {
      const standard = leagueList.find(
        (l: any) => l.type === "standard" && l.status === "active",
      );
      if (standard) {
        await api.leagues.join(standard.id);
      }
    }

    // 4. Load full player state
    await this.refreshState();
  }

  /**
   * Re-fetch the full player state from server and populate local cache.
   */
  async refreshState(): Promise<void> {
    const state = await api.player.getState();

    this.data.gold = Number(state.gold);
    this.data.activeCharacterId = state.activeCharacterId;
    this.data.characters = state.characters.map((c: any) => ({
      id: c.id,
      nickname: c.nickname,
      classId: c.classId,
      skinId: c.skinId,
      leagueId: c.leagueId,
      leagueName: c.leagueName,
      leagueType: c.leagueType,
      createdAt: c.createdAt,
      level: c.level,
      xp: c.xp,
      xpToNext: c.xpToNext,
      tapDamage: c.tapDamage,
      critChance: c.critChance,
      critMultiplier: c.critMultiplier,
      passiveDps: c.passiveDps,
      combat: c.combat,
      locations: c.locations,
      inventory: c.inventory,
      bag: [], // Bag is per-league, not per-character
      endgame: c.endgame,
      allocatedNodes: c.allocatedNodes || [],
    }));

    this.bag = (state.bag || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quality: item.quality,
      level: item.level,
      icon: item.icon,
      acquiredAt: item.acquiredAt,
      tier: item.tier,
      locationId: item.locationId,
      locationAct: item.locationAct,
      bossId: item.bossId,
      bossKeyTier: item.bossKeyTier,
    }));

    this.data.meta = {
      lastSaveTime: state.meta.lastSaveTime,
      totalTaps: state.meta.totalTaps,
      totalKills: state.meta.totalKills,
      totalGold: state.meta.totalGold,
      version: state.meta.version,
    };

    // Rebuild backward-compatible view if character is active
    if (this.data.activeCharacterId) {
      this._rebuildPlayerView();
    }

    this.events.emit("stateLoaded", this.data);
  }

  /* ── Save (no-op — server handles persistence) ──────── */

  save(): void {
    // No-op: server is authoritative, no localStorage writes
  }

  scheduleSave(): void {
    // No-op: server handles persistence
  }

  reset(): void {
    this.data = createDefault();
    this._playerProxy = null;
    this.bag = [];
    this.events.emit("stateLoaded", this.data);
  }

  /* ── Offline Progress ───────────────────────────────── */

  /**
   * Claim offline gold from server.
   */
  async claimOfflineGold(): Promise<{ offlineGold: number; seconds: number }> {
    const result = await api.player.claimOfflineGold();
    if (result.offlineGold > 0 && result.gold) {
      this.data.gold = Number(result.gold);
      if (this.data.player) {
        (this.data.player as any).gold = this.data.gold;
      }
    }
    return { offlineGold: result.offlineGold, seconds: result.seconds };
  }

  /* ── Character helpers ──────────────────────────────── */

  hasCharacters(): boolean {
    return this.data.characters.length > 0;
  }

  getActiveCharacter(): Character | null {
    if (!this.data.activeCharacterId) return null;
    return (
      this.data.characters.find(
        (c) => c.id === this.data.activeCharacterId,
      ) || null
    );
  }

  /**
   * Create character via API.
   */
  async createCharacter(nickname: string, classId: string, leagueId?: string): Promise<Character> {
    await api.characters.create(nickname, classId, leagueId);
    await this.refreshState();
    const char = this.getActiveCharacter();
    if (char) {
      this.events.emit("characterChanged", char);
    }
    return char!;
  }

  /**
   * Activate character via API.
   */
  async setActiveCharacter(charId: string): Promise<Character | null> {
    await api.characters.activate(charId);
    await this.refreshState();
    const char = this.getActiveCharacter();
    if (char) {
      this.events.emit("characterChanged", char);
    }
    return char;
  }

  /**
   * Change skin via API.
   */
  async setSkin(skinId: string): Promise<void> {
    const char = this.getActiveCharacter();
    if (!char) return;
    await api.characters.changeSkin(char.id!, skinId);
    char.skinId = skinId;
    this.events.emit("skinChanged", { charId: char.id, skinId });
  }

  /* ── Endgame helpers ───────────────────────────────── */

  /**
   * Check endgame unlock via API.
   */
  async checkEndgameUnlock(): Promise<boolean> {
    const char = this.getActiveCharacter();
    if (!char) return false;
    if (char.endgame?.unlocked) return false;

    const result = await api.endgame.checkUnlock(char.id!);
    if (result.unlocked && !result.alreadyUnlocked) {
      char.endgame.unlocked = true;
      await this.refreshBag();
      this.events.emit("endgameUnlocked");
      return true;
    }
    return false;
  }

  /**
   * Refresh bag items from server.
   */
  async refreshBag(): Promise<void> {
    const result = await api.loot.getBag();
    const items = Array.isArray(result) ? result : (result as any).items || [];
    this.bag = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quality: item.quality,
      level: item.level,
      icon: item.icon,
      acquiredAt: Number(item.acquiredAt),
      tier: item.tier,
      locationId: item.locationId,
      locationAct: item.locationAct,
      bossId: item.bossId,
      bossKeyTier: item.bossKeyTier,
    }));
  }

  /**
   * Get all map keys from the league bag.
   */
  getMapKeys(): BagItem[] {
    return this.bag.filter(
      (item) => item.type === "map_key" || item.type === "boss_map_key",
    );
  }

  /**
   * Update local state from combat completion response.
   */
  updateFromCombatComplete(result: {
    totalGold: number;
    totalXp: number;
    level?: number;
    xp?: number;
    xpToNext?: number;
    gold?: number;
    mapDrops?: BagItem[];
    locationId?: string;
  }): void {
    if (result.gold !== undefined) {
      this.data.gold = result.gold;
    }

    const char = this.getActiveCharacter();
    if (char && result.level !== undefined) {
      char.level = result.level;
      char.xp = result.xp ?? char.xp;
      char.xpToNext = result.xpToNext ?? char.xpToNext;
    }

    if (result.locationId && char) {
      if (!char.locations.completed.includes(result.locationId)) {
        char.locations.completed.push(result.locationId);
      }
    }

    if (result.mapDrops) {
      for (const drop of result.mapDrops) {
        this.bag.push(drop);
      }
    }

    this._rebuildPlayerView();

    if (this.data.player) {
      this.events.emit("goldChanged", { gold: this.data.player.gold });
      this.events.emit("xpChanged", {
        xp: this.data.player.xp,
        xpToNext: this.data.player.xpToNext,
      });
    }
    if (result.level !== undefined && char) {
      this.events.emit("levelUp", { level: result.level });
    }
  }

  /* ── Backward-compatible player view ──────────────── */

  _rebuildPlayerView(): void {
    const char = this.getActiveCharacter();
    if (!char) return;

    const self = this;
    const playerView: Record<string, any> = {};

    const charFields: string[] = [
      "level",
      "xp",
      "xpToNext",
      "tapDamage",
      "critChance",
      "critMultiplier",
      "passiveDps",
    ];
    for (const key of charFields) {
      Object.defineProperty(playerView, key, {
        get() {
          return (char as any)[key];
        },
        set(v: any) {
          (char as any)[key] = v;
        },
        enumerable: true,
      });
    }

    Object.defineProperty(playerView, "gold", {
      get() {
        return self.data.gold;
      },
      set(v: number) {
        self.data.gold = v;
      },
      enumerable: true,
    });

    this.data.player = playerView as PlayerProxy;
    this.data.combat = char.combat;
    this.data.locations = char.locations;
    this.data.inventory = char.inventory;
    this.data.endgame = char.endgame;

    this._playerProxy = playerView as PlayerProxy;
  }
}
