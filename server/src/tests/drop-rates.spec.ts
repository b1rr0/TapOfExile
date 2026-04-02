/**
 * Loot Pool simulation tests.
 *
 * New system: 3 independent rolls per combat, weighted pool with implicit
 * "nothing" = sum of all item weights (always 50% nothing per roll).
 *
 * Runs 100 combats for each source (location acts 1-5, map tiers 1-10,
 * boss maps) and prints drop distribution tables.
 *
 * Run: npx jest src/tests/drop-rates.spec.ts --verbose
 */

import {
  rollLoot,
  rollPool,
  getLootPool,
  getPoolStats,
  getFlaskDef,
  QUALITY_CHARGES,
  ROLLS_PER_COMBAT,
  LOCATION_LOOT_POOLS,
  getMapLootPool,
  BOSS_MAP_LOOT_POOL,
  type LootPool,
  type LootEntry,
} from '@shared/potion-drops';

import {
  rollMapDrops,
  createMapKeyData,
  createBossKeyData,
} from '@shared/endgame-maps';

import type { BagItemData } from '@shared/types';

const COMBATS = 100;

// ── Helpers ─────────────────────────────────────────────

interface LootStats {
  totalCombats: number;
  totalRolls: number;
  totalDrops: number;
  nothingCount: number;
  avgDropsPerCombat: string;
  byEntry: Record<string, number>;
  byFlask: Record<string, number>;
  byQuality: Record<string, number>;
}

function simulateLootPool(pool: LootPool, combats: number): LootStats {
  const byEntry: Record<string, number> = {};
  const byFlask: Record<string, number> = {};
  const byQuality: Record<string, number> = {};
  let totalDrops = 0;

  for (let i = 0; i < combats; i++) {
    const drops = rollLoot(pool);
    totalDrops += drops.length;

    for (const entry of drops) {
      byEntry[entry.id] = (byEntry[entry.id] || 0) + 1;
      if (entry.result.type === 'potion') {
        byFlask[entry.result.flaskType] = (byFlask[entry.result.flaskType] || 0) + 1;
        byQuality[entry.result.quality] = (byQuality[entry.result.quality] || 0) + 1;
      }
    }
  }

  const totalRolls = combats * ROLLS_PER_COMBAT;

  return {
    totalCombats: combats,
    totalRolls,
    totalDrops,
    nothingCount: totalRolls - totalDrops,
    avgDropsPerCombat: (totalDrops / combats).toFixed(2),
    byEntry,
    byFlask,
    byQuality,
  };
}

function formatRecord(rec: Record<string, number>): string {
  const entries = Object.entries(rec).sort(([, a], [, b]) => b - a);
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}

// ── Tests ───────────────────────────────────────────────

describe('Loot Pool System', () => {
  describe('Core mechanics', () => {
    it('rollPool returns null ~50% of the time', () => {
      const pool = LOCATION_LOOT_POOLS[1];
      let nulls = 0;
      const runs = 10000;
      for (let i = 0; i < runs; i++) {
        if (rollPool(pool) === null) nulls++;
      }
      const pct = nulls / runs;
      // Should be close to 50% (±5% tolerance for randomness)
      expect(pct).toBeGreaterThan(0.45);
      expect(pct).toBeLessThan(0.55);
      console.log(`\n  Nothing rate: ${(pct * 100).toFixed(1)}% (expected ~50%)`);
    });

    it('ROLLS_PER_COMBAT is 3', () => {
      expect(ROLLS_PER_COMBAT).toBe(3);
    });

    it('rollLoot returns 0-3 items', () => {
      const pool = LOCATION_LOOT_POOLS[1];
      for (let i = 0; i < 100; i++) {
        const drops = rollLoot(pool);
        expect(drops.length).toBeGreaterThanOrEqual(0);
        expect(drops.length).toBeLessThanOrEqual(3);
      }
    });

    it('getPoolStats calculates correct percentages', () => {
      const pool = LOCATION_LOOT_POOLS[1];
      const stats = getPoolStats(pool);
      expect(stats.nothingChancePct).toBeCloseTo(50, 0);
      expect(stats.somethingChancePerRollPct).toBeCloseTo(50, 0);
      expect(stats.expectedDropsPerCombat).toBeCloseTo(1.5, 1);

      console.log(`\n  Pool stats Act 1:`);
      console.log(`    Total item weight: ${stats.totalItemWeight}`);
      console.log(`    Nothing weight: ${stats.nothingWeight}`);
      console.log(`    Something/roll: ${stats.somethingChancePerRollPct.toFixed(1)}%`);
      console.log(`    Expected drops/combat: ${stats.expectedDropsPerCombat.toFixed(2)}`);
      for (const e of stats.entries) {
        console.log(`    ${e.id.padEnd(25)} weight: ${String(e.weight).padStart(5)}  chance: ${e.chancePct.toFixed(2)}%`);
      }
    });
  });

  describe('Location drops (Acts 1-5)', () => {
    for (let act = 1; act <= 5; act++) {
      it(`Act ${act}: ${COMBATS} combats × 3 rolls`, () => {
        const pool = getLootPool('location', act);
        const stats = simulateLootPool(pool, COMBATS);

        console.log(`\n  ═══ ACT ${act} ═══`);
        console.log(`  ${stats.totalDrops} drops / ${stats.totalRolls} rolls (avg ${stats.avgDropsPerCombat}/combat)`);
        console.log(`  Flasks:  ${formatRecord(stats.byFlask)}`);
        console.log(`  Quality: ${formatRecord(stats.byQuality)}`);

        expect(stats.totalDrops).toBeGreaterThan(0);
        expect(stats.totalDrops).toBeLessThanOrEqual(stats.totalRolls);
      });
    }
  });

  describe('Map drops (Tiers 1-10)', () => {
    for (let tier = 1; tier <= 10; tier++) {
      it(`Tier ${tier}: ${COMBATS} combats × 3 rolls`, () => {
        const pool = getLootPool('map', tier);
        const stats = simulateLootPool(pool, COMBATS);

        console.log(`\n  ═══ MAP TIER ${tier} ═══`);
        console.log(`  ${stats.totalDrops} drops / ${stats.totalRolls} rolls (avg ${stats.avgDropsPerCombat}/combat)`);
        console.log(`  Flasks:  ${formatRecord(stats.byFlask)}`);
        console.log(`  Quality: ${formatRecord(stats.byQuality)}`);

        expect(stats.totalDrops).toBeGreaterThan(0);
        expect(stats.totalDrops).toBeLessThanOrEqual(stats.totalRolls);
      });
    }
  });

  describe('Boss map drops', () => {
    it(`Boss map: ${COMBATS} combats × 3 rolls`, () => {
      const pool = getLootPool('boss_map', 0);
      const stats = simulateLootPool(pool, COMBATS);

      console.log(`\n  ═══ BOSS MAP ═══`);
      console.log(`  ${stats.totalDrops} drops / ${stats.totalRolls} rolls (avg ${stats.avgDropsPerCombat}/combat)`);
      console.log(`  Flasks:  ${formatRecord(stats.byFlask)}`);
      console.log(`  Quality: ${formatRecord(stats.byQuality)}`);

      expect(stats.totalDrops).toBeGreaterThan(0);
    });
  });
});

describe('Map Key Drop Rates', () => {
  const mkFactory = (t: number): BagItemData => ({ ...createMapKeyData(t), name: `Tier ${t} Map Key` });
  const bkFactory = (bossId: string, bkt: number): BagItemData | null => createBossKeyData(bossId, bkt);

  describe('Regular maps (Tiers 1-10)', () => {
    for (let tier = 1; tier <= 10; tier++) {
      it(`Tier ${tier}: ${COMBATS} runs`, () => {
        let totalMapKeys = 0;
        let totalBossKeys = 0;
        const mapKeysByTier: Record<number, number> = {};
        const bossKeysByTier: Record<number, number> = {};

        for (let i = 0; i < COMBATS; i++) {
          const drops = rollMapDrops(tier, false, null, mkFactory, bkFactory);
          for (const d of drops) {
            if (d.type === 'map_key') { totalMapKeys++; mapKeysByTier[d.tier || 0] = (mapKeysByTier[d.tier || 0] || 0) + 1; }
            if (d.type === 'boss_key') { totalBossKeys++; bossKeysByTier[d.bossKeyTier || 0] = (bossKeysByTier[d.bossKeyTier || 0] || 0) + 1; }
          }
        }

        console.log(`\n  ═══ MAP TIER ${tier} - KEY DROPS ═══`);
        console.log(`  Map keys: ${totalMapKeys} (${formatRecord(mapKeysByTier as any)})`);
        console.log(`  Boss keys: ${totalBossKeys} (${formatRecord(bossKeysByTier as any)})`);

        expect(totalMapKeys).toBeGreaterThanOrEqual(0);
      });
    }
  });
});

describe('Quality progression summary', () => {
  it('1000 combats per source - progression table', () => {
    const bigRuns = 1000;

    console.log('\n  ═══ PROGRESSION (1000 combats × 3 rolls each) ═══');
    console.log('  Source               | Avg/combat | Avg Heal% | Avg Charges | Legendary%');
    console.log('  ─────────────────────┼────────────┼───────────┼─────────────┼──────────');

    const sources: { label: string; pool: LootPool }[] = [
      ...([1, 2, 3, 4, 5] as const).map((a) => ({
        label: `Act ${a}`.padEnd(21),
        pool: getLootPool('location', a),
      })),
      ...([1, 3, 5, 7, 9, 10] as const).map((t) => ({
        label: `Map Tier ${t}`.padEnd(21),
        pool: getLootPool('map', t),
      })),
      { label: 'Boss Map'.padEnd(21), pool: getLootPool('boss_map', 0) },
    ];

    for (const { label, pool } of sources) {
      let totalDrops = 0;
      let totalHeal = 0;
      let totalCharges = 0;
      let legendaryCount = 0;

      for (let i = 0; i < bigRuns; i++) {
        const drops = rollLoot(pool);
        totalDrops += drops.length;
        for (const entry of drops) {
          if (entry.result.type === 'potion') {
            const flask = getFlaskDef(entry.result.flaskType);
            totalHeal += flask.healPercent;
            totalCharges += QUALITY_CHARGES[entry.result.quality] ?? 2;
            if (entry.result.quality === 'legendary') legendaryCount++;
          }
        }
      }

      const avgPerCombat = totalDrops / bigRuns;
      const avgHeal = totalDrops > 0 ? totalHeal / totalDrops : 0;
      const avgCharges = totalDrops > 0 ? totalCharges / totalDrops : 0;
      const legendaryPct = totalDrops > 0 ? legendaryCount / totalDrops : 0;

      console.log(
        `  ${label}| ${avgPerCombat.toFixed(2).padStart(10)}` +
        ` | ${(avgHeal * 100).toFixed(1).padStart(9)}%` +
        ` | ${avgCharges.toFixed(2).padStart(11)}` +
        ` | ${(legendaryPct * 100).toFixed(1).padStart(9)}%`,
      );
    }

    // Basic sanity: Act 1 pool exists
    expect(LOCATION_LOOT_POOLS[1]).toBeDefined();
  });
});
