const SAVE_KEY = "33metro_save";

function createDefault() {
  return {
    player: {
      level: 1,
      xp: 0,
      xpToNext: 100,
      gold: 0,
      tapDamage: 1,
      critChance: 0.05,
      critMultiplier: 2.0,
      passiveDps: 0,
    },
    combat: {
      currentStage: 1,
      currentWave: 1,
      wavesPerStage: 10,
    },
    upgrades: {
      tapDamage: { level: 0, baseCost: 10, costMultiplier: 1.15 },
      critChance: { level: 0, baseCost: 50, costMultiplier: 1.2 },
      critMultiplier: { level: 0, baseCost: 100, costMultiplier: 1.25 },
      passiveDps: { level: 0, baseCost: 25, costMultiplier: 1.12 },
    },
    meta: {
      lastSaveTime: Date.now(),
      totalTaps: 0,
      totalKills: 0,
      totalGold: 0,
    },
  };
}

export class GameState {
  constructor(events) {
    this.events = events;
    this.data = createDefault();
    this._saveTimer = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.data = this._merge(createDefault(), saved);
      }
    } catch {
      this.data = createDefault();
    }
    this.events.emit("stateLoaded", this.data);
  }

  save() {
    this.data.meta.lastSaveTime = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
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
    this.save();
    this.events.emit("stateLoaded", this.data);
  }

  calculateOfflineProgress() {
    const now = Date.now();
    const elapsed = (now - this.data.meta.lastSaveTime) / 1000;
    const maxSeconds = 8 * 60 * 60;
    const seconds = Math.min(elapsed, maxSeconds);

    if (seconds < 10 || this.data.player.passiveDps <= 0) {
      return { offlineGold: 0, seconds: 0 };
    }

    const offlineGold = Math.floor(this.data.player.passiveDps * seconds * 0.5);
    return { offlineGold, seconds };
  }

  _merge(defaults, saved) {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (saved[key] === undefined) continue;
      if (
        typeof defaults[key] === "object" &&
        defaults[key] !== null &&
        !Array.isArray(defaults[key])
      ) {
        result[key] = this._merge(defaults[key], saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
    return result;
  }
}
