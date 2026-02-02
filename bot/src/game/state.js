import { getCharacterClass } from "../data/character-classes.js";

const SAVE_KEY = "33metro_save";

/* ── V2 default state ─────────────────────────────────── */

function createDefault() {
  return {
    gold: 0,
    activeCharacterId: null,
    characters: [],
    meta: {
      lastSaveTime: Date.now(),
      totalTaps: 0,
      totalKills: 0,
      totalGold: 0,
      version: 3,
    },
  };
}

function createDefaultCharacter() {
  return {
    id: null,
    nickname: "",
    classId: "",
    skinId: "",
    createdAt: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    tapDamage: 1,
    critChance: 0.05,
    critMultiplier: 2.0,
    passiveDps: 0,
    combat: { currentStage: 1, currentWave: 1, wavesPerStage: 10 },
    locations: { completed: [], current: null, currentAct: 1 },
    inventory: { items: [], equipment: {} },
    bag: [],  // Array of item objects: { id, name, quality, level, icon, acquiredAt }
  };
}

/* ── GameState ─────────────────────────────────────────── */

export class GameState {
  constructor(events) {
    this.events = events;
    this.data = createDefault();
    this._saveTimer = null;
    this._playerProxy = null;
  }

  /* ── Load / Save ──────────────────────────────────────── */

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);

        // Detect old V1 format (has player at top level, no characters array)
        if (saved.player && !saved.characters) {
          this.data = this._migrateV1(saved);
        } else {
          this.data = this._mergeV2(createDefault(), saved);
        }

        // V2 → V3: prefix location IDs with act1_, add currentAct
        if (this.data.meta.version < 3) {
          this._migrateV2toV3();
        }
      }
    } catch {
      this.data = createDefault();
    }

    // Rebuild backward-compatible view if character is active
    if (this.data.activeCharacterId) {
      this._rebuildPlayerView();
    }

    this.events.emit("stateLoaded", this.data);
  }

  save() {
    this.data.meta.lastSaveTime = Date.now();

    // Serialize only canonical fields (not the player/combat/etc. proxy aliases)
    const toSave = {
      gold: this.data.gold,
      activeCharacterId: this.data.activeCharacterId,
      characters: this.data.characters,
      meta: this.data.meta,
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    } catch {
      // storage full — ignore
    }
  }

  scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this.save();
      this._saveTimer = null;
    }, 1000);
  }

  reset() {
    this.data = createDefault();
    this._playerProxy = null;
    this.save();
    this.events.emit("stateLoaded", this.data);
  }

  /* ── Offline Progress ─────────────────────────────────── */

  calculateOfflineProgress() {
    const now = Date.now();
    const elapsed = (now - this.data.meta.lastSaveTime) / 1000;
    const maxSeconds = 8 * 60 * 60;
    const seconds = Math.min(elapsed, maxSeconds);

    if (seconds < 10 || !this.data.player || this.data.player.passiveDps <= 0) {
      return { offlineGold: 0, seconds: 0 };
    }

    const offlineGold = Math.floor(this.data.player.passiveDps * seconds * 0.5);
    return { offlineGold, seconds };
  }

  /* ── Character helpers ────────────────────────────────── */

  hasCharacters() {
    return this.data.characters.length > 0;
  }

  getActiveCharacter() {
    if (!this.data.activeCharacterId) return null;
    return this.data.characters.find(c => c.id === this.data.activeCharacterId) || null;
  }

  createCharacter(nickname, classId) {
    const classDef = getCharacterClass(classId);
    if (!classDef) throw new Error(`Unknown class: ${classId}`);

    const char = {
      ...createDefaultCharacter(),
      id: "char_" + Date.now(),
      nickname,
      classId,
      skinId: classDef.skinId,
      createdAt: Date.now(),
    };

    this.data.characters.push(char);
    this.data.activeCharacterId = char.id;
    this._rebuildPlayerView();
    this.save();
    this.events.emit("characterChanged", char);
    return char;
  }

  setActiveCharacter(charId) {
    const char = this.data.characters.find(c => c.id === charId);
    if (!char) return null;
    this.data.activeCharacterId = charId;
    this._rebuildPlayerView();
    this.save();
    this.events.emit("characterChanged", char);
    return char;
  }

  /**
   * Change the active character's skin.
   * @param {string} skinId — key into HERO_SKINS
   */
  setSkin(skinId) {
    const char = this.getActiveCharacter();
    if (!char) return;
    char.skinId = skinId;
    this.save();
    this.events.emit("skinChanged", { charId: char.id, skinId });
  }

  /* ── Backward-compatible player view ──────────────────── */

  /**
   * Builds a proxy object so that existing code reading
   * state.data.player.level, state.data.combat, etc.
   * transparently reads/writes the active character's data.
   * Gold goes to the global pool.
   */
  _rebuildPlayerView() {
    const char = this.getActiveCharacter();
    if (!char) return;

    const self = this;
    const playerView = {};

    // Per-character fields delegate to the character object
    const charFields = [
      "level", "xp", "xpToNext",
      "tapDamage", "critChance", "critMultiplier", "passiveDps",
    ];
    for (const key of charFields) {
      Object.defineProperty(playerView, key, {
        get() { return char[key]; },
        set(v) { char[key] = v; },
        enumerable: true,
      });
    }

    // Gold delegates to global
    Object.defineProperty(playerView, "gold", {
      get() { return self.data.gold; },
      set(v) { self.data.gold = v; },
      enumerable: true,
    });

    this.data.player = playerView;

    // Alias sub-objects directly to the character's data
    this.data.combat = char.combat;
    this.data.locations = char.locations;
    this.data.inventory = char.inventory;

    this._playerProxy = playerView;
  }

  /* ── Migration V1 → V2 ──────────────────────────────── */

  _migrateV1(saved) {
    const oldPlayer = saved.player || {};

    const migratedChar = {
      ...createDefaultCharacter(),
      id: "char_migrated",
      nickname: "Samurai",
      classId: "samurai",
      skinId: "samurai_1",
      createdAt: saved.meta?.lastSaveTime || Date.now(),
      level: oldPlayer.level || 1,
      xp: oldPlayer.xp || 0,
      xpToNext: oldPlayer.xpToNext || 100,
      tapDamage: oldPlayer.tapDamage || 1,
      critChance: oldPlayer.critChance || 0.05,
      critMultiplier: oldPlayer.critMultiplier || 2.0,
      passiveDps: oldPlayer.passiveDps || 0,
      combat: saved.combat || { currentStage: 1, currentWave: 1, wavesPerStage: 10 },
      locations: saved.locations || { completed: [], current: null, currentAct: 1 },
      inventory: saved.inventory || { items: [], equipment: {} },
    };

    return {
      gold: oldPlayer.gold || 0,
      activeCharacterId: migratedChar.id,
      characters: [migratedChar],
      meta: {
        lastSaveTime: saved.meta?.lastSaveTime || Date.now(),
        totalTaps: saved.meta?.totalTaps || 0,
        totalKills: saved.meta?.totalKills || 0,
        totalGold: saved.meta?.totalGold || 0,
        version: 2,
      },
    };
  }

  /* ── Migration V2 → V3 (act-prefixed location IDs) ──── */

  _migrateV2toV3() {
    for (const char of this.data.characters) {
      if (char.locations && Array.isArray(char.locations.completed)) {
        char.locations.completed = char.locations.completed.map((id) =>
          id.startsWith("act") ? id : `act1_${id}`
        );
      }
      if (char.locations) {
        char.locations.currentAct = char.locations.currentAct || 1;
      }
      if (char.locations && char.locations.current && !char.locations.current.startsWith("act")) {
        char.locations.current = `act1_${char.locations.current}`;
      }
    }
    this.data.meta.version = 3;
  }

  /* ── V2 merge (preserves arrays as-is) ───────────────── */

  _mergeV2(defaults, saved) {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (saved[key] === undefined) continue;

      if (Array.isArray(defaults[key])) {
        // Arrays (like characters): use saved value directly
        result[key] = saved[key];
      } else if (
        typeof defaults[key] === "object" &&
        defaults[key] !== null
      ) {
        result[key] = this._mergeV2(defaults[key], saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
    return result;
  }
}
