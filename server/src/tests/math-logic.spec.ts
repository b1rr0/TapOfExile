/**
 * Comprehensive Math Logic Unit Tests.
 *
 * Covers ALL deterministic and probabilistic math formulas:
 *   - Elemental damage & resistance calculations
 *   - Drop chance (loot pool rolling, map key drops)
 *   - Equipment bonus application
 *   - Class stat scaling per level
 *   - XP level-scaling formula
 *   - Monster stat formulas (from balance constants)
 *   - Helper utilities: tierQuality, pickBossKeyTier, getFlaskDef, etc.
 *
 * Run: npx jest src/tests/math-logic.spec.ts --verbose
 */

import { computeElementalDamage } from '../combat/elemental-damage';

import {
  rollPool,
  rollLoot,
  getPoolStats,
  getFlaskDef,
  weightedPick,
  getLootPool,
  getMapLootPool,
  ROLLS_PER_COMBAT,
  QUALITY_CHARGES,
  LOCATION_LOOT_POOLS,
  BOSS_MAP_LOOT_POOL,
  type LootPool,
} from '@shared/potion-drops';

import {
  rollMapDrops,
  pickBossKeyTier,
  tierQuality,
  getTierDef,
  getBossKeyTierDef,
  DROP_SETTINGS,
  createMapKeyData,
  createBossKeyData,
  BOSS_MAPS,
  MAX_TIER,
} from '@shared/endgame-maps';

import {
  applyBonuses,
  emptyBonuses,
  aggregateEquipmentStats,
  type BaseCharStats,
} from '@shared/equipment-bonus';

import {
  statsAtLevel,
  specialAtLevel,
  CLASS_DEFS,
  MAX_LEVEL,
} from '@shared/class-stats';

import { B } from '@shared/balance';

import type { BagItemData } from '@shared/types';

// ── Factories ─────────────────────────────────────────────────────────────────

/** Full factory using real createMapKeyData (for simulation tests) */
const mkFactory = (t: number): BagItemData =>
  ({ ...createMapKeyData(t), name: `Tier ${t} Map Key` });

const bkFactory = (bossId: string, bkt: number): BagItemData | null =>
  createBossKeyData(bossId, bkt);

/**
 * Simple deterministic factories for mock-based tests.
 * These do NOT call uid() / Math.random() internally, so mock sequences
 * match exactly the calls made by rollMapDrops logic only.
 */
const testMkFactory = (t: number): BagItemData => ({
  id: `test_map_t${t}`,
  name: `Tier ${t} Map`,
  type: 'map_key',
  tier: t,
  quality: 'common',
  acquiredAt: 0,
});

const testBkFactory = (bossId: string, bkt: number): BagItemData | null => ({
  id: `test_boss_${bossId}_t${bkt}`,
  name: `Boss Key T${bkt}`,
  type: 'boss_map_key',
  bossId,
  bossKeyTier: bkt,
  quality: 'common',
  acquiredAt: 0,
});

const KNOWN_BOSS_ID = BOSS_MAPS[0].id; // 'boss_shadow_shogun'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBaseStats(overrides: Partial<BaseCharStats> = {}): BaseCharStats {
  return {
    tapDamage: 10,
    maxHp: 100,
    hp: 100,
    critChance: 0.05,
    critMultiplier: 1.5,
    dodgeChance: 0.02,
    specialValue: 0,
    resistance: {},
    elementalDamage: { physical: 1.0 },
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. computeElementalDamage
// ══════════════════════════════════════════════════════════════════════════════

describe('computeElementalDamage', () => {

  describe('zero damage', () => {
    it('returns all zeros when rawDamage is 0', () => {
      const result = computeElementalDamage(0, { physical: 1.0 }, {});
      expect(result.total).toBe(0);
      expect(result.physical).toBe(0);
    });

    it('does NOT apply minimum-1 guarantee when rawDamage is 0', () => {
      const result = computeElementalDamage(0, { physical: 1.0 }, { physical: 95 });
      expect(result.total).toBe(0);
    });
  });

  describe('pure physical — no resistance', () => {
    it('passes full damage through with 0% resistance', () => {
      const r = computeElementalDamage(100, { physical: 1.0 }, {});
      expect(r.physical).toBe(100);
      expect(r.total).toBe(100);
    });

    it('floors fractional physical damage', () => {
      // 33 * 1.0 = 33 (integer — no change)
      const r = computeElementalDamage(33, { physical: 1.0 }, {});
      expect(r.physical).toBe(33);
    });
  });

  describe('resistance reduction', () => {
    it('50% resistance halves physical damage', () => {
      const r = computeElementalDamage(100, { physical: 1.0 }, { physical: 50 });
      expect(r.physical).toBe(50);
      expect(r.total).toBe(50);
    });

    it('25% resistance reduces damage by 25', () => {
      const r = computeElementalDamage(100, { physical: 1.0 }, { physical: 25 });
      expect(r.physical).toBe(75);
    });

    it('floors result after resistance (10 * 33% resist = 6.7 → floor = 6)', () => {
      const r = computeElementalDamage(10, { physical: 1.0 }, { physical: 33 });
      // 10 * (1 - 0.33) = 6.7 → floor = 6
      expect(r.physical).toBe(6);
    });

    it('0% resistance: no reduction', () => {
      const r = computeElementalDamage(50, { physical: 1.0 }, { physical: 0 });
      expect(r.physical).toBe(50);
    });

    it('negative resistance (vulnerability) amplifies damage', () => {
      // rawDamage=100, physical 100%, resistance=-50 (vulnerable)
      // effective = 100 * (1 - (-50 * 0.01)) = 100 * 1.5 = 150
      const r = computeElementalDamage(100, { physical: 1.0 }, { physical: -50 });
      expect(r.physical).toBe(150);
      expect(r.total).toBe(150);
    });
  });

  describe('resistance cap at 95% (monster cap)', () => {
    it('caps monster resistance at 95% — floor(100 * (1-95*0.01)) = 4 (float precision)', () => {
      const r = computeElementalDamage(100, { physical: 1.0 }, { physical: 95 });
      // 95 * 0.01 = 0.9500000000000001 (float), so 1 - that = 0.0499999...
      // 100 * 0.04999... = 4.999... → Math.floor = 4
      expect(r.physical).toBe(4);
    });

    it('capped at 95 even when resistance is 100 — same result as 95', () => {
      const r100 = computeElementalDamage(100, { physical: 1.0 }, { physical: 100 });
      const r95  = computeElementalDamage(100, { physical: 1.0 }, { physical: 95 });
      expect(r100.physical).toBe(r95.physical);
    });

    it('capped at 95 even when resistance is 200 — same result as 95', () => {
      const r200 = computeElementalDamage(100, { physical: 1.0 }, { physical: 200 });
      const r95  = computeElementalDamage(100, { physical: 1.0 }, { physical: 95 });
      expect(r200.physical).toBe(r95.physical);
    });

    it('resistance 94 is NOT capped — more damage passes than at 95', () => {
      const r94 = computeElementalDamage(100, { physical: 1.0 }, { physical: 94 });
      const r95 = computeElementalDamage(100, { physical: 1.0 }, { physical: 95 });
      expect(r94.physical).toBeGreaterThanOrEqual(r95.physical);
    });
  });

  describe('pure element — bypasses all resistance', () => {
    it('pure damage ignores physical resistance', () => {
      const r = computeElementalDamage(100, { pure: 1.0 }, { physical: 95 });
      expect(r.pure).toBe(100);
      expect(r.total).toBe(100);
    });

    it('pure damage ignores fire/cold/lightning resistance', () => {
      const r = computeElementalDamage(100, { pure: 1.0 }, {
        physical: 95, fire: 95, lightning: 95, cold: 95,
      });
      expect(r.pure).toBe(100);
    });

    it('pure damage is floored', () => {
      // 10 * 0.333 = 3.33 → floor = 3
      const r = computeElementalDamage(10, { physical: 0.667, pure: 0.333 }, {});
      expect(r.pure).toBe(3);
    });
  });

  describe('minimum 1 damage guarantee', () => {
    it('guarantees 1 total damage when all elemental damage floors to 0', () => {
      // 1 * (1 - 0.95) = 0.05 → floor = 0 → minimum kicks in
      const r = computeElementalDamage(1, { physical: 1.0 }, { physical: 95 });
      expect(r.total).toBe(1);
      expect(r.physical).toBe(1);
    });

    it('assigns minimum damage to physical element', () => {
      const r = computeElementalDamage(1, { physical: 1.0 }, { physical: 95 });
      expect(r.physical).toBe(1);
    });

    it('does NOT apply minimum when total > 0', () => {
      // 2 * (1 - 0.95) = 0.1 → floor = 0 → still triggers minimum
      const r = computeElementalDamage(20, { physical: 1.0 }, { physical: 95 });
      // 20 * 0.05 = 1 → floor = 1 (not minimum case)
      expect(r.total).toBe(1);
    });
  });

  describe('multi-element damage split', () => {
    it('50/50 physical+fire split with no resistance', () => {
      const r = computeElementalDamage(100, { physical: 0.5, fire: 0.5 }, {});
      expect(r.physical).toBe(50);
      expect(r.fire).toBe(50);
      expect(r.total).toBe(100);
    });

    it('50/50 split with 50% fire resistance', () => {
      const r = computeElementalDamage(100, { physical: 0.5, fire: 0.5 }, { fire: 50 });
      expect(r.physical).toBe(50);
      expect(r.fire).toBe(25);
      expect(r.total).toBe(75);
    });

    it('all 5 elements combined', () => {
      const r = computeElementalDamage(500, {
        physical: 0.2,
        fire: 0.2,
        lightning: 0.2,
        cold: 0.2,
        pure: 0.2,
      }, {
        physical: 50,
        fire: 50,
        lightning: 50,
        cold: 50,
      });
      // Each resistable element: 500 * 0.2 = 100, reduced by 50% = 50
      // Pure: 500 * 0.2 = 100, no reduction
      expect(r.physical).toBe(50);
      expect(r.fire).toBe(50);
      expect(r.lightning).toBe(50);
      expect(r.cold).toBe(50);
      expect(r.pure).toBe(100);
      expect(r.total).toBe(300);
    });

    it('elements with zero fraction contribute 0 damage', () => {
      const r = computeElementalDamage(100, { physical: 1.0 }, {});
      expect(r.fire).toBe(0);
      expect(r.lightning).toBe(0);
      expect(r.cold).toBe(0);
      expect(r.pure).toBe(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. rollPool — deterministic with mocked Math.random
// ══════════════════════════════════════════════════════════════════════════════

describe('rollPool — deterministic', () => {
  let randomSpy: jest.SpyInstance;
  afterEach(() => randomSpy?.mockRestore());

  const singlePool: LootPool = {
    entries: [{ id: 'test_item', weight: 1000, result: { type: 'potion', flaskType: 'small_vial', quality: 'common' } }],
  };

  const twoItemPool: LootPool = {
    entries: [
      { id: 'item_a', weight: 700, result: { type: 'potion', flaskType: 'small_vial', quality: 'common' } },
      { id: 'item_b', weight: 300, result: { type: 'potion', flaskType: 'round_flask', quality: 'rare' } },
    ],
  };

  it('empty pool always returns null', () => {
    expect(rollPool({ entries: [] })).toBeNull();
  });

  it('returns item when roll=0 (lower boundary)', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollPool(singlePool)?.id).toBe('test_item');
  });

  it('returns item when roll is just below 0.5 of wheel', () => {
    // wheelTotal=2000, roll=0.4999*2000=999.8 → 999.8-1000=-0.2 ≤ 0 → item
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.4999);
    expect(rollPool(singlePool)?.id).toBe('test_item');
  });

  it('returns item at exactly 0.5 (boundary — falls in item zone)', () => {
    // wheelTotal=2000, roll=0.5*2000=1000 → 1000-1000=0 ≤ 0 → item
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(rollPool(singlePool)?.id).toBe('test_item');
  });

  it('returns null when roll > 0.5 (nothing zone)', () => {
    // wheelTotal=2000, roll=0.5001*2000=1000.2 → 1000.2-1000=0.2 > 0 → null
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.50001);
    expect(rollPool(singlePool)).toBeNull();
  });

  it('returns null at roll close to 1.0', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(rollPool(singlePool)).toBeNull();
  });

  it('picks first item (weight 700) when roll is in its range', () => {
    // twoItemPool: total=1000, wheel=2000
    // item_a occupies [0, 700), item_b [700, 1000), nothing [1000, 2000)
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.30);
    // roll=600 → 600-700=-100 ≤ 0 → item_a
    expect(rollPool(twoItemPool)?.id).toBe('item_a');
  });

  it('picks second item (weight 300) when roll is in its range', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.40);
    // roll=800 → 800-700=100 > 0 → 100-300=-200 ≤ 0 → item_b
    expect(rollPool(twoItemPool)?.id).toBe('item_b');
  });

  it('returns null (nothing) when roll is past both items', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.55);
    // roll=1100 → 1100-700=400 → 400-300=100 > 0 → null
    expect(rollPool(twoItemPool)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. rollLoot
// ══════════════════════════════════════════════════════════════════════════════

describe('rollLoot', () => {
  let randomSpy: jest.SpyInstance;
  afterEach(() => randomSpy?.mockRestore());

  const pool: LootPool = {
    entries: [{ id: 'item', weight: 1000, result: { type: 'potion', flaskType: 'small_vial', quality: 'common' } }],
  };

  it('returns empty array when all 3 rolls are "nothing"', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(rollLoot(pool)).toHaveLength(0);
  });

  it('returns 3 items when all 3 rolls win', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const drops = rollLoot(pool);
    expect(drops).toHaveLength(3);
  });

  it('default rolls = ROLLS_PER_COMBAT = 3', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const drops = rollLoot(pool);
    expect(drops.length).toBeLessThanOrEqual(ROLLS_PER_COMBAT);
  });

  it('respects custom rolls parameter', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollLoot(pool, 5)).toHaveLength(5);
    expect(rollLoot(pool, 1)).toHaveLength(1);
    expect(rollLoot(pool, 0)).toHaveLength(0);
  });

  it('filters out null (nothing) rolls', () => {
    // First 2 calls → item (0.2), third → nothing (0.9)
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.9);
    const drops = rollLoot(pool);
    expect(drops).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. getPoolStats
// ══════════════════════════════════════════════════════════════════════════════

describe('getPoolStats', () => {
  const pool: LootPool = {
    entries: [
      { id: 'a', weight: 600, result: { type: 'potion', flaskType: 'small_vial', quality: 'common' } },
      { id: 'b', weight: 400, result: { type: 'potion', flaskType: 'round_flask', quality: 'rare' } },
    ],
  };

  it('nothing chance is always exactly 50%', () => {
    const stats = getPoolStats(pool);
    expect(stats.nothingChancePct).toBe(50);
  });

  it('something chance per roll is always 50%', () => {
    const stats = getPoolStats(pool);
    expect(stats.somethingChancePerRollPct).toBe(50);
  });

  it('expected drops per combat = ROLLS_PER_COMBAT * 0.5 = 1.5', () => {
    const stats = getPoolStats(pool);
    expect(stats.expectedDropsPerCombat).toBe(ROLLS_PER_COMBAT * 0.5);
    expect(stats.expectedDropsPerCombat).toBe(1.5);
  });

  it('nothingWeight equals totalItemWeight', () => {
    const stats = getPoolStats(pool);
    expect(stats.nothingWeight).toBe(stats.totalItemWeight);
    expect(stats.nothingWeight).toBe(1000);
  });

  it('entry chancePct sums to 50%', () => {
    const stats = getPoolStats(pool);
    const totalChance = stats.entries.reduce((s, e) => s + e.chancePct, 0);
    expect(totalChance).toBeCloseTo(50, 5);
  });

  it('individual entry chance = weight / (total * 2) * 100', () => {
    const stats = getPoolStats(pool);
    // totalWeight=1000, wheelTotal=2000
    // a: 600/2000 * 100 = 30%
    const entryA = stats.entries.find(e => e.id === 'a')!;
    expect(entryA.chancePct).toBeCloseTo(30, 5);
    // b: 400/2000 * 100 = 20%
    const entryB = stats.entries.find(e => e.id === 'b')!;
    expect(entryB.chancePct).toBeCloseTo(20, 5);
  });

  it('works with LOCATION_LOOT_POOLS[1] (Act 1)', () => {
    const stats = getPoolStats(LOCATION_LOOT_POOLS[1]);
    expect(stats.nothingChancePct).toBe(50);
    expect(stats.expectedDropsPerCombat).toBe(1.5);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. weightedPick — deterministic
// ══════════════════════════════════════════════════════════════════════════════

describe('weightedPick', () => {
  let randomSpy: jest.SpyInstance;
  afterEach(() => randomSpy?.mockRestore());

  it('picks first item at roll=0', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    // weights: {a:700, b:300}, total=1000
    // roll=0 → 0-700=-700 ≤ 0 → 'a'
    const result = weightedPick({ a: 700, b: 300 } as any);
    expect(result).toBe('a');
  });

  it('picks first item when roll lands in first weight range', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.69);
    // roll=690 → 690-700=-10 ≤ 0 → 'a'
    expect(weightedPick({ a: 700, b: 300 } as any)).toBe('a');
  });

  it('picks second item when roll lands in second weight range', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.71);
    // roll=710 → 710-700=10 > 0 → 10-300=-290 ≤ 0 → 'b'
    expect(weightedPick({ a: 700, b: 300 } as any)).toBe('b');
  });

  it('picks last item at roll near 1.0', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(weightedPick({ a: 700, b: 300 } as any)).toBe('b');
  });

  it('returns first key when total weight is 0', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(weightedPick({ a: 0 } as any)).toBe('a');
  });

  it('works with single entry (always returns that entry)', () => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(weightedPick({ only: 100 } as any)).toBe('only');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. getLootPool / getMapLootPool
// ══════════════════════════════════════════════════════════════════════════════

describe('getLootPool', () => {
  it('mode=location returns LOCATION_LOOT_POOLS[act]', () => {
    expect(getLootPool('location', 1)).toBe(LOCATION_LOOT_POOLS[1]);
    expect(getLootPool('location', 5)).toBe(LOCATION_LOOT_POOLS[5]);
  });

  it('mode=location with invalid act falls back to act 1', () => {
    expect(getLootPool('location', 99)).toBe(LOCATION_LOOT_POOLS[1]);
    expect(getLootPool('location', 0)).toBe(LOCATION_LOOT_POOLS[1]);
  });

  it('mode=boss_map returns BOSS_MAP_LOOT_POOL regardless of tier', () => {
    expect(getLootPool('boss_map', 0)).toBe(BOSS_MAP_LOOT_POOL);
    expect(getLootPool('boss_map', 10)).toBe(BOSS_MAP_LOOT_POOL);
  });

  it('mode=map returns tiered pool', () => {
    const pool = getLootPool('map', 5);
    expect(pool.entries.length).toBeGreaterThan(0);
  });
});

describe('getMapLootPool — tier brackets', () => {
  it('tiers 1-2: includes round_flask entries', () => {
    [1, 2].forEach(t => {
      const pool = getMapLootPool(t);
      expect(pool.entries.some(e => e.result.flaskType === 'round_flask')).toBe(true);
    });
  });

  it('tiers 3-4: includes corked_flask and tall_bottle entries', () => {
    [3, 4].forEach(t => {
      const pool = getMapLootPool(t);
      expect(pool.entries.some(e => e.result.flaskType === 'corked_flask')).toBe(true);
      expect(pool.entries.some(e => e.result.flaskType === 'tall_bottle')).toBe(true);
    });
  });

  it('tiers 5-6: includes jug entries', () => {
    [5, 6].forEach(t => {
      const pool = getMapLootPool(t);
      expect(pool.entries.some(e => e.result.flaskType === 'jug')).toBe(true);
    });
  });

  it('tiers 7-8: includes jug and wide_bottle entries', () => {
    [7, 8].forEach(t => {
      const pool = getMapLootPool(t);
      expect(pool.entries.some(e => e.result.flaskType === 'jug')).toBe(true);
      expect(pool.entries.some(e => e.result.flaskType === 'wide_bottle')).toBe(true);
    });
  });

  it('tiers 9-10: does NOT include round_flask (graduated out)', () => {
    [9, 10].forEach(t => {
      const pool = getMapLootPool(t);
      expect(pool.entries.some(e => e.result.flaskType === 'round_flask')).toBe(false);
    });
  });

  it('tiers 9-10: has higher-weight jug than lower tiers', () => {
    const pool910 = getMapLootPool(10);
    const pool12 = getMapLootPool(1);
    const jugWeight910 = pool910.entries.filter(e => e.result.flaskType === 'jug').reduce((s, e) => s + e.weight, 0);
    const jugWeight12 = pool12.entries.filter(e => e.result.flaskType === 'jug').reduce((s, e) => s + e.weight, 0);
    expect(jugWeight910).toBeGreaterThan(jugWeight12);
  });

  it('all pools maintain 50% nothing rate (property-based)', () => {
    [1, 2, 3, 5, 7, 9, 10].forEach(t => {
      const stats = getPoolStats(getMapLootPool(t));
      expect(stats.nothingChancePct).toBe(50);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. rollMapDrops — regular maps
//    Uses testMkFactory / testBkFactory which do NOT call Math.random(),
//    so mock sequences map exactly to rollMapDrops logic calls only.
//
//    Regular map Math.random() call order:
//      1. keyRoll    — determines regular key type
//      2. bossRoll   — boss key check (only if tier >= bossKeyMinTier=5)
// ══════════════════════════════════════════════════════════════════════════════

describe('rollMapDrops — regular maps', () => {
  let randomSpy: jest.SpyInstance;
  afterEach(() => randomSpy?.mockRestore());

  it('drops tier+1 key when keyRoll < tierUpChance (0.20)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.10)  // keyRoll → tier+1
      .mockReturnValueOnce(0.99); // bossKeyRoll → no
    const drops = rollMapDrops(7, false, null, testMkFactory, testBkFactory);
    expect(drops).toHaveLength(1);
    expect(drops[0].tier).toBe(8);
  });

  it('drops same-tier key when keyRoll in [0.20, 0.80)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.50)  // keyRoll → same tier
      .mockReturnValueOnce(0.99); // bossKeyRoll → no
    const drops = rollMapDrops(7, false, null, testMkFactory, testBkFactory);
    expect(drops).toHaveLength(1);
    expect(drops[0].tier).toBe(7);
  });

  it('drops same-tier key at the exact boundary (keyRoll = 0.20)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.20)  // keyRoll = exactly tierUpChance → same-tier branch
      .mockReturnValueOnce(0.99);
    const drops = rollMapDrops(7, false, null, testMkFactory, testBkFactory);
    expect(drops[0].tier).toBe(7);
  });

  it('drops no key when keyRoll >= 0.80', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85)  // keyRoll → nothing
      .mockReturnValueOnce(0.99); // bossKeyRoll → no
    const drops = rollMapDrops(7, false, null, testMkFactory, testBkFactory);
    expect(drops.filter(d => d.type === 'map_key')).toHaveLength(0);
  });

  it('drops boss key when bossKeyRoll < 0.05 and tier >= bossKeyMinTier', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85)  // keyRoll → no regular key
      .mockReturnValueOnce(0.02); // bossKeyRoll → boss key!
    const drops = rollMapDrops(7, false, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    const bossKeys = drops.filter(d => d.type === 'boss_map_key');
    expect(bossKeys).toHaveLength(1);
  });

  it('does NOT drop boss key at tier < bossKeyMinTier (tier 4)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85) // keyRoll → no key; no boss check for tier 4
      .mockReturnValue(0.99);    // fallback — should never be called
    const drops = rollMapDrops(4, false, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    expect(drops.filter(d => d.type === 'boss_map_key')).toHaveLength(0);
  });

  it('at MAX_TIER (10), tier+1 roll falls to same-tier branch (cannot exceed max)', () => {
    // keyRoll=0.10 < 0.20 BUT tier=10 is NOT < MAX_TIER → else-if same-tier branch
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.10)  // normally tier+1, but tier=MAX_TIER
      .mockReturnValueOnce(0.99);
    const drops = rollMapDrops(MAX_TIER, false, null, testMkFactory, testBkFactory);
    expect(drops).toHaveLength(1);
    expect(drops[0].tier).toBe(MAX_TIER);
  });

  it('boss key tier is correct for map tier 7 (→ boss tier 2)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85)  // no regular key
      .mockReturnValueOnce(0.02); // boss key
    const drops = rollMapDrops(7, false, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    const bossKey = drops.find(d => d.type === 'boss_map_key');
    expect(bossKey?.bossKeyTier).toBe(2);
  });

  it('boss key tier is correct for map tier 5 (→ boss tier 1)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85)
      .mockReturnValueOnce(0.02);
    const drops = rollMapDrops(5, false, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    const bossKey = drops.find(d => d.type === 'boss_map_key');
    expect(bossKey?.bossKeyTier).toBe(1);
  });

  it('boss key tier is correct for map tier 9 (→ boss tier 3)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.85)
      .mockReturnValueOnce(0.02);
    const drops = rollMapDrops(9, false, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    const bossKey = drops.find(d => d.type === 'boss_map_key');
    expect(bossKey?.bossKeyTier).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. rollMapDrops — boss maps
//    Boss map Math.random() call order:
//      1. tierRoll   — picks guaranteed key tier in [5, 8]
//      2. bonusRoll  — 30% chance for bonus key
//      3. bossRoll   — 5% chance for boss key
// ══════════════════════════════════════════════════════════════════════════════

describe('rollMapDrops — boss maps', () => {
  let randomSpy: jest.SpyInstance;
  afterEach(() => randomSpy?.mockRestore());

  it('always drops exactly 1 regular map key (guaranteed)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // tier roll → tier 5
      .mockReturnValueOnce(0.99) // no bonus key
      .mockReturnValueOnce(0.99); // no boss key
    const drops = rollMapDrops(0, true, null, testMkFactory, testBkFactory);
    const mapKeys = drops.filter(d => d.type === 'map_key');
    expect(mapKeys).toHaveLength(1);
  });

  it('boss map guaranteed key tier is in range [5, 8]', () => {
    const tierRolls = [0, 0.249, 0.50, 0.749, 0.999];
    tierRolls.forEach(mockVal => {
      const spy = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(mockVal)
        .mockReturnValueOnce(0.99)
        .mockReturnValueOnce(0.99);
      const drops = rollMapDrops(0, true, null, testMkFactory, testBkFactory);
      const key = drops.find(d => d.type === 'map_key');
      expect(key?.tier).toBeGreaterThanOrEqual(DROP_SETTINGS.boss.guaranteedTierMin);
      expect(key?.tier).toBeLessThanOrEqual(DROP_SETTINGS.boss.guaranteedTierMax);
      spy.mockRestore();
    });
  });

  it('drops bonus key when bonusKeyRoll < 0.30', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // tier roll → tier 5
      .mockReturnValueOnce(0.25) // bonus key! (< 0.30)
      .mockReturnValueOnce(0.99); // no boss key
    const drops = rollMapDrops(0, true, null, testMkFactory, testBkFactory);
    const mapKeys = drops.filter(d => d.type === 'map_key');
    expect(mapKeys).toHaveLength(2); // guaranteed + bonus
  });

  it('bonus key tier = guaranteed tier + 1', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // tier roll → tier 5
      .mockReturnValueOnce(0.25) // bonus key
      .mockReturnValueOnce(0.99);
    const drops = rollMapDrops(0, true, null, testMkFactory, testBkFactory);
    const mapKeys = drops.filter(d => d.type === 'map_key').sort((a, b) => (a.tier || 0) - (b.tier || 0));
    expect(mapKeys[1].tier).toBe((mapKeys[0].tier || 0) + 1);
  });

  it('does NOT drop bonus key when bonusKeyRoll >= 0.30', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.31) // no bonus (>= 0.30)
      .mockReturnValueOnce(0.99);
    const drops = rollMapDrops(0, true, null, testMkFactory, testBkFactory);
    expect(drops.filter(d => d.type === 'map_key')).toHaveLength(1);
  });

  it('drops boss key when bossKeyRoll < 0.05', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // tier roll
      .mockReturnValueOnce(0.99) // no bonus
      .mockReturnValueOnce(0.02); // boss key!
    const drops = rollMapDrops(0, true, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    expect(drops.filter(d => d.type === 'boss_map_key')).toHaveLength(1);
  });

  it('boss key from boss map is always tier 3 (Mythic)', () => {
    randomSpy = jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.02);
    const drops = rollMapDrops(0, true, KNOWN_BOSS_ID, testMkFactory, testBkFactory);
    const bossKey = drops.find(d => d.type === 'boss_map_key');
    expect(bossKey?.bossKeyTier).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. pickBossKeyTier
// ══════════════════════════════════════════════════════════════════════════════

describe('pickBossKeyTier', () => {
  it('boss map always returns tier 3 regardless of source tier', () => {
    [1, 5, 10].forEach(t => {
      expect(pickBossKeyTier(t, true)).toBe(3);
    });
  });

  it('source tier 9-10 → boss tier 3', () => {
    expect(pickBossKeyTier(9, false)).toBe(3);
    expect(pickBossKeyTier(10, false)).toBe(3);
  });

  it('source tier 7-8 → boss tier 2', () => {
    expect(pickBossKeyTier(7, false)).toBe(2);
    expect(pickBossKeyTier(8, false)).toBe(2);
  });

  it('source tier 1-6 → boss tier 1', () => {
    [1, 2, 3, 4, 5, 6].forEach(t => {
      expect(pickBossKeyTier(t, false)).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. tierQuality
// ══════════════════════════════════════════════════════════════════════════════

describe('tierQuality', () => {
  it('tiers 1-3 → "common"', () => {
    expect(tierQuality(1)).toBe('common');
    expect(tierQuality(2)).toBe('common');
    expect(tierQuality(3)).toBe('common');
  });

  it('tiers 4-6 → "rare"', () => {
    expect(tierQuality(4)).toBe('rare');
    expect(tierQuality(5)).toBe('rare');
    expect(tierQuality(6)).toBe('rare');
  });

  it('tiers 7-9 → "epic"', () => {
    expect(tierQuality(7)).toBe('epic');
    expect(tierQuality(8)).toBe('epic');
    expect(tierQuality(9)).toBe('epic');
  });

  it('tier 10 → "legendary"', () => {
    expect(tierQuality(10)).toBe('legendary');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. getTierDef / getBossKeyTierDef
// ══════════════════════════════════════════════════════════════════════════════

describe('getTierDef', () => {
  it('returns correct tier definition', () => {
    expect(getTierDef(1).hpMul).toBe(1.0);
    expect(getTierDef(5).hpMul).toBe(4.5);
    expect(getTierDef(10).hpMul).toBe(25.0);
  });

  it('clamps to tier 1 when tier <= 0', () => {
    expect(getTierDef(0)).toEqual(getTierDef(1));
    expect(getTierDef(-5)).toEqual(getTierDef(1));
  });

  it('clamps to tier 10 when tier > 10', () => {
    expect(getTierDef(11)).toEqual(getTierDef(10));
    expect(getTierDef(100)).toEqual(getTierDef(10));
  });

  it('goldMul and xpMul scale with tier', () => {
    const t1 = getTierDef(1);
    const t10 = getTierDef(10);
    expect(t10.goldMul).toBeGreaterThan(t1.goldMul);
    expect(t10.xpMul).toBeGreaterThan(t1.xpMul);
  });
});

describe('getBossKeyTierDef', () => {
  it('tier 1 → Standard (hpScale 1.0)', () => {
    const def = getBossKeyTierDef(1);
    expect(def.tier).toBe(1);
    expect(def.hpScale).toBe(1.0);
    expect(def.name).toBe('Standard');
  });

  it('tier 2 → Empowered (hpScale 1.8)', () => {
    const def = getBossKeyTierDef(2);
    expect(def.hpScale).toBe(1.8);
    expect(def.goldScale).toBe(2.0);
  });

  it('tier 3 → Mythic (hpScale 3.0)', () => {
    const def = getBossKeyTierDef(3);
    expect(def.hpScale).toBe(3.0);
    expect(def.goldScale).toBe(3.5);
    expect(def.xpScale).toBe(3.0);
  });

  it('clamps tier 0 to tier 1', () => {
    expect(getBossKeyTierDef(0)).toEqual(getBossKeyTierDef(1));
  });

  it('clamps tier 4+ to tier 3', () => {
    expect(getBossKeyTierDef(4)).toEqual(getBossKeyTierDef(3));
    expect(getBossKeyTierDef(10)).toEqual(getBossKeyTierDef(3));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. applyBonuses — equipment stat formulas
// ══════════════════════════════════════════════════════════════════════════════

describe('applyBonuses', () => {
  it('no bonuses: returns base tapDamage unchanged (floor of base)', () => {
    const base = makeBaseStats({ tapDamage: 10 });
    const result = applyBonuses(base, emptyBonuses());
    // floor((10 + 0) * (1 + 0/100)) = 10
    expect(result.tapDamage).toBe(10);
  });

  it('damage formula: floor((base + flat) * (1 + pct/100))', () => {
    const base = makeBaseStats({ tapDamage: 10 });
    const bonuses = { ...emptyBonuses(), flatPhysDmg: 5, pctPhysDmg: 20 };
    const result = applyBonuses(base, bonuses);
    // floor((10 + 5) * (1 + 20/100)) = floor(15 * 1.2) = floor(18) = 18
    expect(result.tapDamage).toBe(18);
  });

  it('damage formula floors correctly (non-integer result)', () => {
    const base = makeBaseStats({ tapDamage: 7 });
    const bonuses = { ...emptyBonuses(), flatPhysDmg: 0, pctPhysDmg: 50 };
    // floor((7 + 0) * 1.5) = floor(10.5) = 10
    expect(applyBonuses(base, bonuses).tapDamage).toBe(10);
  });

  it('HP formula: floor((base + flat) * (1 + pct/100))', () => {
    const base = makeBaseStats({ maxHp: 100, hp: 100 });
    const bonuses = { ...emptyBonuses(), flatHp: 50, pctHp: 10 };
    // floor((100 + 50) * 1.1) = floor(165) = 165
    expect(applyBonuses(base, bonuses).maxHp).toBe(165);
  });

  it('HP scales current HP proportionally when maxHp increases', () => {
    const base = makeBaseStats({ maxHp: 100, hp: 50 });
    const bonuses = { ...emptyBonuses(), flatHp: 100 };
    // maxHp becomes 200; hp scales: floor(50 * 200/100) = 100
    const result = applyBonuses(base, bonuses);
    expect(result.maxHp).toBe(200);
    expect(result.hp).toBe(100);
  });

  it('HP is capped at maxHp after scaling', () => {
    const base = makeBaseStats({ maxHp: 100, hp: 100 });
    const bonuses = { ...emptyBonuses(), flatHp: 0, pctHp: 0 };
    const result = applyBonuses(base, bonuses);
    expect(result.hp).toBeLessThanOrEqual(result.maxHp);
  });

  it('crit chance is additive: base + bonus/100', () => {
    const base = makeBaseStats({ critChance: 0.05 });
    const bonuses = { ...emptyBonuses(), critChance: 5 }; // +5 percentage points
    // 0.05 + 5/100 = 0.10
    expect(applyBonuses(base, bonuses).critChance).toBeCloseTo(0.10, 5);
  });

  it('crit multiplier is additive: base + bonus/100', () => {
    const base = makeBaseStats({ critMultiplier: 1.5 });
    const bonuses = { ...emptyBonuses(), critMultiplier: 20 }; // +20 percentage points
    // 1.5 + 20/100 = 1.70
    expect(applyBonuses(base, bonuses).critMultiplier).toBeCloseTo(1.70, 5);
  });

  it('resistance: base + gear, capped at 75', () => {
    const base = makeBaseStats({ resistance: { fire: 50, physical: 0, lightning: 0, cold: 0 } });
    const bonuses = { ...emptyBonuses(), fireRes: 40 };
    // 50 + 40 = 90 → capped at 75
    const result = applyBonuses(base, bonuses);
    expect((result.resistance as any).fire).toBe(75);
  });

  it('resistance exactly at cap (75) is NOT over-capped', () => {
    const base = makeBaseStats({ resistance: { fire: 70, physical: 0, lightning: 0, cold: 0 } });
    const bonuses = { ...emptyBonuses(), fireRes: 5 };
    expect((applyBonuses(base, bonuses).resistance as any).fire).toBe(75);
  });

  it('resistance below cap is not modified', () => {
    const base = makeBaseStats({ resistance: { fire: 30, physical: 0, lightning: 0, cold: 0 } });
    const bonuses = { ...emptyBonuses(), fireRes: 20 };
    expect((applyBonuses(base, bonuses).resistance as any).fire).toBe(50);
  });

  it('armor formula: floor(flatArmor * (1 + pctArmor/100))', () => {
    const base = makeBaseStats();
    const bonuses = { ...emptyBonuses(), flatArmor: 100, pctArmor: 50 };
    // floor(100 * 1.5) = 150
    expect(applyBonuses(base, bonuses).armor).toBe(150);
  });

  it('zero flat armor yields 0 armor regardless of pct', () => {
    const base = makeBaseStats();
    const bonuses = { ...emptyBonuses(), flatArmor: 0, pctArmor: 100 };
    expect(applyBonuses(base, bonuses).armor).toBe(0);
  });

  it('dodge chance is unchanged by equipment bonuses', () => {
    const base = makeBaseStats({ dodgeChance: 0.10 });
    const result = applyBonuses(base, { ...emptyBonuses(), flatEvasion: 500 });
    expect(result.dodgeChance).toBe(0.10);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. aggregateEquipmentStats
// ══════════════════════════════════════════════════════════════════════════════

describe('aggregateEquipmentStats', () => {
  it('empty items array returns all-zero bonuses', () => {
    const result = aggregateEquipmentStats([]);
    expect(result.flatPhysDmg).toBe(0);
    expect(result.pctPhysDmg).toBe(0);
    expect(result.flatHp).toBe(0);
    expect(result.critChance).toBe(0);
  });

  it('adds baseDamage as flatPhysDmg', () => {
    const items = [{ properties: { baseDamage: 50 } }];
    const result = aggregateEquipmentStats(items);
    expect(result.flatPhysDmg).toBe(50);
  });

  it('adds implicit stat correctly', () => {
    const items = [{ properties: { implicit: { id: 'flat_hp', value: 30 } } }];
    const result = aggregateEquipmentStats(items);
    expect(result.flatHp).toBe(30);
  });

  it('adds rolled stats correctly', () => {
    const items = [{ properties: { stats: [
      { id: 'pct_phys_dmg', value: 20 },
      { id: 'crit_chance', value: 5 },
    ] } }];
    const result = aggregateEquipmentStats(items);
    expect(result.pctPhysDmg).toBe(20);
    expect(result.critChance).toBe(5);
  });

  it('stacks bonuses from multiple items', () => {
    const items = [
      { properties: { stats: [{ id: 'flat_hp', value: 50 }] } },
      { properties: { stats: [{ id: 'flat_hp', value: 30 }] } },
    ];
    const result = aggregateEquipmentStats(items);
    expect(result.flatHp).toBe(80);
  });

  it('skips items without properties', () => {
    const items = [{ properties: null as any }, { properties: { stats: [{ id: 'flat_hp', value: 10 }] } }];
    const result = aggregateEquipmentStats(items);
    expect(result.flatHp).toBe(10);
  });

  it('ignores stats with unknown ids (no crash)', () => {
    const items = [{ properties: { stats: [{ id: 'unknown_stat_xyz', value: 999 }] } }];
    expect(() => aggregateEquipmentStats(items)).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. statsAtLevel — class stat scaling
// ══════════════════════════════════════════════════════════════════════════════

describe('statsAtLevel', () => {
  describe('warrior', () => {
    it('level 1 returns exact base stats', () => {
      const stats = statsAtLevel('warrior', 1);
      expect(stats.hp).toBe(100);
      expect(stats.tapDamage).toBe(2);
      expect(stats.critChance).toBe(0.05);
      expect(stats.critMultiplier).toBe(1.5);
      expect(stats.dodgeChance).toBe(0.02);
    });

    it('level 2: hp = floor(100 + 18*1) = 118', () => {
      expect(statsAtLevel('warrior', 2).hp).toBe(118);
    });

    it('level 2: tapDamage = floor(2 + 1.4*1) = floor(3.4) = 3', () => {
      expect(statsAtLevel('warrior', 2).tapDamage).toBe(3);
    });

    it('level 2: critChance = 0.05 + 0.001 = 0.051', () => {
      expect(statsAtLevel('warrior', 2).critChance).toBeCloseTo(0.051, 4);
    });

    it('level 60: hp = floor(100 + 18*59) = 1162', () => {
      expect(statsAtLevel('warrior', 60).hp).toBe(1162);
    });

    it('level 60: tapDamage = floor(2 + 1.4*59) = floor(84.6) = 84', () => {
      expect(statsAtLevel('warrior', 60).tapDamage).toBe(84);
    });

    it('level > MAX_LEVEL is clamped to MAX_LEVEL (60)', () => {
      expect(statsAtLevel('warrior', 100)).toEqual(statsAtLevel('warrior', 60));
      expect(statsAtLevel('warrior', MAX_LEVEL + 1)).toEqual(statsAtLevel('warrior', MAX_LEVEL));
    });

    it('resistance stays at class base (does not scale with level)', () => {
      const lvl1 = statsAtLevel('warrior', 1);
      const lvl60 = statsAtLevel('warrior', 60);
      expect(lvl60.resistance).toEqual(lvl1.resistance);
      expect(lvl1.resistance.physical).toBe(30);
    });
  });

  describe('mage', () => {
    it('level 1 returns correct base stats', () => {
      const stats = statsAtLevel('mage', 1);
      expect(stats.hp).toBe(100);
      expect(stats.tapDamage).toBe(2);
      expect(stats.dodgeChance).toBe(0.03);
    });

    it('level 30: hp = floor(100 + 8*29) = 332', () => {
      expect(statsAtLevel('mage', 30).hp).toBe(332);
    });

    it('level 30: tapDamage = floor(2 + 2.2*29) = floor(65.8) = 65', () => {
      expect(statsAtLevel('mage', 30).tapDamage).toBe(65);
    });

    it('mage has fire resistance at level 1 (20%)', () => {
      expect(statsAtLevel('mage', 1).resistance.fire).toBe(20);
      expect(statsAtLevel('mage', 1).resistance.lightning).toBe(15);
      expect(statsAtLevel('mage', 1).resistance.cold).toBe(15);
    });
  });

  describe('samurai', () => {
    it('level 1: dodgeChance = 0.05 (highest base dodge)', () => {
      expect(statsAtLevel('samurai', 1).dodgeChance).toBe(0.05);
    });

    it('level 60: tapDamage = floor(2 + 1.8*59) = floor(108.2) = 108', () => {
      expect(statsAtLevel('samurai', 60).tapDamage).toBe(108);
    });
  });

  describe('archer', () => {
    it('level 1: dodgeChance = 0.06 (highest base dodge)', () => {
      expect(statsAtLevel('archer', 1).dodgeChance).toBe(0.06);
    });

    it('level 60: tapDamage = floor(2 + 1.6*59) = floor(96.4) = 96', () => {
      expect(statsAtLevel('archer', 60).tapDamage).toBe(96);
    });
  });

  it('unknown class returns fallback stats', () => {
    const stats = statsAtLevel('unknown_class', 1);
    expect(stats.hp).toBe(100);
    expect(stats.tapDamage).toBe(2);
    expect(stats.resistance).toEqual({ physical: 0, fire: 0, lightning: 0, cold: 0 });
  });

  it('fallback class scales with level', () => {
    const stats = statsAtLevel('unknown_class', 10);
    expect(stats.hp).toBe(100 + 10 * 9);  // 190
    expect(stats.tapDamage).toBe(2 + 1 * 9); // 11
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 15. specialAtLevel — class special abilities
// ══════════════════════════════════════════════════════════════════════════════

describe('specialAtLevel', () => {
  it('warrior block at level 1 = 0.15 (15%)', () => {
    expect(specialAtLevel('warrior', 1)).toBe(0.15);
  });

  it('warrior block at level 10: 0.15 + 0.002*9 = 0.168', () => {
    expect(specialAtLevel('warrior', 10)).toBeCloseTo(0.168, 4);
  });

  it('warrior block at level 60: 0.15 + 0.002*59 = 0.268', () => {
    expect(specialAtLevel('warrior', 60)).toBeCloseTo(0.268, 4);
  });

  it('samurai lethal precision at level 1 = 0.50', () => {
    expect(specialAtLevel('samurai', 1)).toBe(0.50);
  });

  it('samurai lethal precision at level 60: 0.50 + 0.02*59 = 1.68', () => {
    expect(specialAtLevel('samurai', 60)).toBeCloseTo(1.68, 4);
  });

  it('mage spell amp at level 1 = 0.08', () => {
    expect(specialAtLevel('mage', 1)).toBe(0.08);
  });

  it('archer double shot at level 1 = 0.12', () => {
    expect(specialAtLevel('archer', 1)).toBe(0.12);
  });

  it('archer double shot at level 60: 0.12 + 0.003*59 = 0.297', () => {
    expect(specialAtLevel('archer', 60)).toBeCloseTo(0.297, 4);
  });

  it('level > MAX_LEVEL is clamped', () => {
    expect(specialAtLevel('warrior', 100)).toEqual(specialAtLevel('warrior', 60));
  });

  it('unknown class returns 0', () => {
    expect(specialAtLevel('unknown', 10)).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 16. QUALITY_CHARGES and getFlaskDef
// ══════════════════════════════════════════════════════════════════════════════

describe('QUALITY_CHARGES', () => {
  it('common = 2 charges', () => expect(QUALITY_CHARGES['common']).toBe(2));
  it('rare = 3 charges', () => expect(QUALITY_CHARGES['rare']).toBe(3));
  it('epic = 4 charges', () => expect(QUALITY_CHARGES['epic']).toBe(4));
  it('legendary = 5 charges', () => expect(QUALITY_CHARGES['legendary']).toBe(5));
  it('charges increase with quality tier', () => {
    expect(QUALITY_CHARGES['common']).toBeLessThan(QUALITY_CHARGES['rare']);
    expect(QUALITY_CHARGES['rare']).toBeLessThan(QUALITY_CHARGES['epic']);
    expect(QUALITY_CHARGES['epic']).toBeLessThan(QUALITY_CHARGES['legendary']);
  });
});

describe('getFlaskDef', () => {
  it('small_vial: healPercent = 0.08', () => {
    expect(getFlaskDef('small_vial').healPercent).toBe(0.08);
  });

  it('round_flask: healPercent = 0.12', () => {
    expect(getFlaskDef('round_flask').healPercent).toBe(0.12);
  });

  it('corked_flask: healPercent = 0.16', () => {
    expect(getFlaskDef('corked_flask').healPercent).toBe(0.16);
  });

  it('tall_bottle: healPercent = 0.20', () => {
    expect(getFlaskDef('tall_bottle').healPercent).toBe(0.20);
  });

  it('wide_bottle: healPercent = 0.24', () => {
    expect(getFlaskDef('wide_bottle').healPercent).toBe(0.24);
  });

  it('jug: healPercent = 0.30', () => {
    expect(getFlaskDef('jug').healPercent).toBe(0.30);
  });

  it('heal percent increases with flask order', () => {
    const defs = ['small_vial', 'round_flask', 'corked_flask', 'tall_bottle', 'wide_bottle', 'jug']
      .map(t => getFlaskDef(t as any).healPercent);
    for (let i = 0; i < defs.length - 1; i++) {
      expect(defs[i]).toBeLessThan(defs[i + 1]);
    }
  });

  it('unknown flask type falls back to small_vial', () => {
    const def = getFlaskDef('unknown_flask' as any);
    expect(def.type).toBe('small_vial');
    expect(def.healPercent).toBe(0.08);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 17. XP level-scaling formula
//     scaledXp = max(1, floor(baseXp / (1 + A * D^2)))
//     A = B.XP_LEVEL_SCALING_A = 0.4
// ══════════════════════════════════════════════════════════════════════════════

describe('XP level-scaling formula', () => {
  const A = B.XP_LEVEL_SCALING_A;

  function scaleXp(baseXp: number, D: number): number {
    return Math.max(1, Math.floor(baseXp / (1 + A * D * D)));
  }

  it('A = 0.4 (scaling coefficient)', () => {
    expect(A).toBe(0.4);
  });

  it('D=0 (same level): no reduction', () => {
    expect(scaleXp(100, 0)).toBe(100);
    expect(scaleXp(500, 0)).toBe(500);
  });

  it('D=1: floor(100 / 1.4) = 71', () => {
    // 1 + 0.4*1 = 1.4 → floor(100/1.4) = floor(71.43) = 71
    expect(scaleXp(100, 1)).toBe(71);
  });

  it('D=5: floor(100 / 11) = 9', () => {
    // 1 + 0.4*25 = 11 → floor(100/11) = 9
    expect(scaleXp(100, 5)).toBe(9);
  });

  it('D=10: floor(100 / 41) = 2', () => {
    // 1 + 0.4*100 = 41 → floor(100/41) = 2
    expect(scaleXp(100, 10)).toBe(2);
  });

  it('large D: always minimum 1 (never drops to 0)', () => {
    expect(scaleXp(1, 50)).toBe(1);   // 1/(1+0.4*2500)=1/1001 ≈ 0 → max(1,0)=1
    expect(scaleXp(1, 100)).toBe(1);
  });

  it('minimum 1 guarantee applies even with tiny baseXp', () => {
    expect(scaleXp(1, 10)).toBe(1);   // 1/41 ≈ 0 → 1
  });

  it('higher D means less XP (monotonically decreasing)', () => {
    const xps = [0, 1, 5, 10, 20].map(d => scaleXp(1000, d));
    for (let i = 0; i < xps.length - 1; i++) {
      expect(xps[i]).toBeGreaterThanOrEqual(xps[i + 1]);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 18. Monster stat formulas (using B constants)
//     hp = MONSTER_HP_BASE * MONSTER_HP_GROWTH^(order-1) * rarityMul
//     dmg = MONSTER_DMG_BASE * MONSTER_DMG_GROWTH^(order-1) * rarityDmgMul
// ══════════════════════════════════════════════════════════════════════════════

describe('Monster HP formula', () => {
  function monsterHp(order: number, rarity: keyof typeof B.RARITY_MULTIPLIERS): number {
    return B.MONSTER_HP_BASE *
      Math.pow(B.MONSTER_HP_GROWTH, order - 1) *
      B.RARITY_MULTIPLIERS[rarity].hpMul;
  }

  it('order 1, common: HP = BASE = 10', () => {
    expect(monsterHp(1, 'common')).toBe(10);
  });

  it('order 2, common: HP = 10 * 1.5 = 15', () => {
    expect(monsterHp(2, 'common')).toBeCloseTo(15, 5);
  });

  it('order 3, common: HP = 10 * 1.5^2 = 22.5', () => {
    expect(monsterHp(3, 'common')).toBeCloseTo(22.5, 5);
  });

  it('order 1, rare: HP = 10 * 1.6 = 16', () => {
    expect(monsterHp(1, 'rare')).toBeCloseTo(16, 5);
  });

  it('order 1, epic: HP = 10 * 2.5 = 25', () => {
    expect(monsterHp(1, 'epic')).toBeCloseTo(25, 5);
  });

  it('order 1, boss: HP = 10 * 4.0 = 40', () => {
    expect(monsterHp(1, 'boss')).toBeCloseTo(40, 5);
  });

  it('higher order = higher HP (exponential growth)', () => {
    const hps = [1, 3, 5, 7, 10].map(o => monsterHp(o, 'common'));
    for (let i = 0; i < hps.length - 1; i++) {
      expect(hps[i]).toBeLessThan(hps[i + 1]);
    }
  });

  it('rarity multipliers are correctly ordered: common < rare < epic < boss', () => {
    const muls = ['common', 'rare', 'epic', 'boss'] as const;
    const vals = muls.map(r => B.RARITY_MULTIPLIERS[r].hpMul);
    for (let i = 0; i < vals.length - 1; i++) {
      expect(vals[i]).toBeLessThan(vals[i + 1]);
    }
  });
});

describe('Monster damage formula', () => {
  function monsterDmg(order: number, rarity: string): number {
    return B.MONSTER_DMG_BASE *
      Math.pow(B.MONSTER_DMG_GROWTH, order - 1) *
      B.RARITY_DMG_MULTIPLIERS[rarity];
  }

  it('order 1, common: DMG = BASE = 3', () => {
    expect(monsterDmg(1, 'common')).toBe(3);
  });

  it('order 2, common: DMG = 3 * 1.4 = 4.2', () => {
    expect(monsterDmg(2, 'common')).toBeCloseTo(4.2, 5);
  });

  it('order 1, rare: DMG = 3 * 1.3 = 3.9', () => {
    expect(monsterDmg(1, 'rare')).toBeCloseTo(3.9, 5);
  });

  it('order 1, boss: DMG = 3 * 2.5 = 7.5', () => {
    expect(monsterDmg(1, 'boss')).toBeCloseTo(7.5, 5);
  });

  it('±10% variance constant is correct', () => {
    expect(B.MONSTER_DMG_RANDOM).toBe(0.10);
  });

  it('damage multipliers ordered: common < rare < epic < boss', () => {
    const vals = ['common', 'rare', 'epic', 'boss'].map(r => B.RARITY_DMG_MULTIPLIERS[r]);
    for (let i = 0; i < vals.length - 1; i++) {
      expect(vals[i]).toBeLessThan(vals[i + 1]);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 19. Balance constants integrity
// ══════════════════════════════════════════════════════════════════════════════

describe('Balance constants integrity', () => {
  it('MAX_LEVEL = 60', () => {
    expect(B.MAX_LEVEL).toBe(60);
    expect(MAX_LEVEL).toBe(60);
  });

  it('XP growth: XP_BASE=100, XP_GROWTH=1.3', () => {
    expect(B.XP_BASE).toBe(100);
    expect(B.XP_GROWTH).toBe(1.3);
  });

  it('monster HP base/growth correct', () => {
    expect(B.MONSTER_HP_BASE).toBe(10);
    expect(B.MONSTER_HP_GROWTH).toBe(1.5);
  });

  it('monster HP random variance is ±15%', () => {
    expect(B.MONSTER_HP_RANDOM).toBe(0.15);
  });

  it('skill fireball = 5× tapDamage', () => {
    expect(B.SKILL_FIREBALL_DMG_MULTIPLIER).toBe(5);
  });

  it('skill sword throw = 4× tapDamage', () => {
    expect(B.SKILL_SWORD_THROW_DMG_MULTIPLIER).toBe(4);
  });

  it('ROLLS_PER_COMBAT = 3', () => {
    expect(ROLLS_PER_COMBAT).toBe(3);
  });

  it('DROP_SETTINGS.regular: sameTierChance + tierUpChance = 0.80', () => {
    const { sameTierChance, tierUpChance } = DROP_SETTINGS.regular;
    // Combined key drop probability = 80%
    expect(sameTierChance + tierUpChance).toBeCloseTo(0.80, 5);
  });

  it('DROP_SETTINGS.regular: bossKeyMinTier = 5', () => {
    expect(DROP_SETTINGS.regular.bossKeyMinTier).toBe(5);
  });

  it('MAP_TIERS has 10 tiers', () => {
    const { MAP_TIERS: tiers } = require('@shared/endgame-maps');
    expect(tiers).toHaveLength(10);
  });
});
