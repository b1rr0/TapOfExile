/**
 * Endgame Map System - re-exported from shared module + FE-only extras.
 *
 * Shared data (tiers, bosses, waves, drop settings) comes from @shared/endgame-maps.
 * FE-only: pickRandomLocation, createMapKeyItem (with location), isEndgameUnlocked.
 */

import { isActComplete, TOTAL_ACTS, ALL_LOCATIONS } from "./locations.js";
import { createMapKeyData, createBossKeyData, rollMapDrops as _rollMapDrops } from "@shared/endgame-maps";
import type { BagItem } from "../types.js";

// ── Re-export all shared data/functions ──────────────────

export {
  DROP_SETTINGS,
  BOSS_KEY_TIERS,
  getBossKeyTierDef,
  pickBossKeyTier,
  MAX_TIER,
  MAP_TIERS,
  getTierDef,
  BOSS_MAPS,
  getBossDef,
  getWavesForTier,
  getBossMapWaves,
  MAP_KEY_TYPES,
  tierQuality,
  createMapKeyData,
  createBossKeyData,
} from "@shared/endgame-maps";

// ── FE-only: location-enriched item factories ────────────

/**
 * Pick a random story location from ALL_LOCATIONS.
 */
function pickRandomLocation() {
  return ALL_LOCATIONS[Math.floor(Math.random() * ALL_LOCATIONS.length)];
}

/**
 * Create a regular map key item for the bag - with location info (FE).
 */
export function createMapKeyItem(tier: number): BagItem {
  const base = createMapKeyData(tier);
  const loc = pickRandomLocation();
  return {
    ...base,
    name: loc.name,
    locationId: loc.id,
    locationAct: loc.act,
  };
}

/**
 * Create a boss map key item for the bag - delegates to shared.
 */
export function createBossMapKeyItem(bossId: string, bossKeyTier: number = 1): BagItem | null {
  return createBossKeyData(bossId, bossKeyTier) as BagItem | null;
}

/**
 * Roll map drops - FE version uses location-enriched createMapKeyItem.
 */
export function rollMapDrops(tier: number, isBossMap: boolean = false, direction: string | null = null): BagItem[] {
  return _rollMapDrops(
    tier,
    isBossMap,
    direction,
    (t) => createMapKeyItem(t),
    (bossId, bkt) => createBossMapKeyItem(bossId, bkt),
  ) as BagItem[];
}

// ── FE-only: endgame unlock check ────────────────────────

/**
 * Check if all acts' main chains are complete -> endgame unlocked.
 */
export function isEndgameUnlocked(completedLocationIds: string[]): boolean {
  for (let act = 1; act <= TOTAL_ACTS; act++) {
    if (!isActComplete(act, completedLocationIds)) return false;
  }
  return true;
}
