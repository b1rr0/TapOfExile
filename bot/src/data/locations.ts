/**
 * Location catalog — 5 acts x 10 locations each (50 total).
 *
 * Each location defines:
 *  - id            unique string key, prefixed with act number (act1_forest_road)
 *  - name          display name
 *  - description   short flavour text
 *  - order         sequence number within the act (1-10), used for scaling
 *  - act           act number (1-5)
 *  - requiredLocationId  id of the location that must be completed first (null = always unlocked)
 *  - background    background key (for future per-location art)
 *  - waves         array of waves, each with monsters [{type, count, rarity}]
 *                  rarity: "common" | "rare" | "epic" | "boss"
 *  - rewards       { gold, xp } BASE rewards (scaled by act at runtime)
 *
 * Main chain = orders 1-8 (linear progression, gates next act).
 * Side branches = orders 9-10 (optional, don't gate act progression).
 */

import { B } from "./balance.js";
import type { Location, Wave, ActDefinition, ActModifier } from "../types.js";

/* ── Per-act wave templates ───────────────────────────────
 *
 * Each act has unique enemy composition matching its theme + story.
 * skinVariant on boss entries gives them a distinct color.
 *
 * Monster types available:
 *   Goblin (goblin), Ninja (yellow_ninja), Bandit (soldier),
 *   Wild Boar (orc), Forest Spirit (blue_witch), Ronin (ronin_enemy),
 *   Necromancer (necromancer_1), Night Born (night_born_1),
 *   Dark Knight (knight_enemy), Oni (king), Tengu (necromancer_2),
 *   Dragon (paladin), Reaper (reaper), Shogun (striker)
 * ──────────────────────────────────────────────────────── */

/* ── ACT 1: The Castle ─── Goblins, Bandits, Ninja — Boss: Dark Knight (golden) */
const ACT1_WAVES: Wave[][] = [
  // order 1 — Castle Gate
  [
    { monsters: [{ type: "Goblin", count: 4, rarity: "common" }] },
    { monsters: [{ type: "Goblin", count: 3, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Bandit", count: 3, rarity: "common" }, { type: "Goblin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Bandit", count: 1, rarity: "epic" }] },
  ],
  // order 2 — Outer Ward
  [
    { monsters: [{ type: "Bandit", count: 3, rarity: "common" }, { type: "Goblin", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Goblin", count: 2, rarity: "rare", skinVariant: "goblin_crimson" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 1, rarity: "epic" }] },
  ],
  // order 3 — Dungeon Entrance
  [
    { monsters: [{ type: "Goblin", count: 4, rarity: "common", skinVariant: "goblin_emerald" }, { type: "Bandit", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ninja", count: 3, rarity: "common" }, { type: "Goblin", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Bandit", count: 2, rarity: "rare" }, { type: "Ninja", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 1, rarity: "epic" }] },
  ],
  // order 4 — Armory Hall
  [
    { monsters: [{ type: "Ninja", count: 4, rarity: "common" }, { type: "Goblin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Bandit", count: 3, rarity: "rare" }, { type: "Ninja", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 1, rarity: "epic", skinVariant: "ninja_crimson" }, { type: "Bandit", count: 2, rarity: "rare" }] },
  ],
  // order 5 — Servants Quarters (mid-boss)
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common" }, { type: "Ninja", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ninja", count: 3, rarity: "rare", skinVariant: "ninja_shadow" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Ronin", count: 1, rarity: "boss", skinVariant: "ronin_enemy__v1_crimson" }] },
  ],
  // order 6 — Grand Hall
  [
    { monsters: [{ type: "Bandit", count: 3, rarity: "common", skinVariant: "soldier__v3_azure" }, { type: "Ronin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Ninja", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dark Knight", count: 1, rarity: "boss", skinVariant: "knight_enemy__v3_azure" }] },
  ],
  // order 7 — Tower Ascent
  [
    { monsters: [{ type: "Ronin", count: 3, rarity: "common" }, { type: "Dark Knight", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dark Knight", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss", skinVariant: "king__v1_crimson" }] },
  ],
  // order 8 — Shogun's Chamber (act boss)
  [
    { monsters: [{ type: "Ninja", count: 4, rarity: "common", skinVariant: "ninja_golden" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "rare" }, { type: "Ronin", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Dark Knight", count: 2, rarity: "epic", skinVariant: "knight_enemy__v1_crimson" }, { type: "Ronin", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss", skinVariant: "striker__v4_golden" }] },
  ],
  // order 9 — Hidden Treasury (side)
  [
    { monsters: [{ type: "Goblin", count: 5, rarity: "common", skinVariant: "goblin_golden" }] },
    { monsters: [{ type: "Goblin", count: 3, rarity: "rare", skinVariant: "goblin_golden" }, { type: "Ninja", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 2, rarity: "epic", skinVariant: "ninja_golden" }, { type: "Goblin", count: 1, rarity: "epic", skinVariant: "goblin_golden" }] },
  ],
  // order 10 — Castle Dungeon (side boss)
  [
    { monsters: [{ type: "Goblin", count: 5, rarity: "common", skinVariant: "goblin_shadow" }, { type: "Bandit", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Ninja", count: 4, rarity: "rare", skinVariant: "ninja_shadow" }, { type: "Goblin", count: 2, rarity: "rare", skinVariant: "goblin_shadow" }] },
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "epic", skinVariant: "knight_enemy__v7_shadow" }] },
    { monsters: [{ type: "Dark Knight", count: 1, rarity: "boss", skinVariant: "knight_enemy__v7_shadow" }] },
  ],
];

/* ── ACT 2: Open Meadow ─── Bandits, Wild Boar, Forest Spirit — Boss: Necromancer (crimson) */
const ACT2_WAVES: Wave[][] = [
  // order 1 — Castle Outskirts
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare" }, { type: "Bandit", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Bandit", count: 1, rarity: "epic", skinVariant: "soldier__v2_emerald" }] },
  ],
  // order 2 — Flower Fields
  [
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "common" }, { type: "Goblin", count: 3, rarity: "common", skinVariant: "goblin_emerald" }] },
    { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare", skinVariant: "orc__v2_emerald" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }] },
  ],
  // order 3 — Old Mill
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Wild Boar", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Bandit", count: 2, rarity: "rare", skinVariant: "soldier__v2_emerald" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }] },
  ],
  // order 4 — Riverside Path
  [
    { monsters: [{ type: "Forest Spirit", count: 4, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "rare" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic", skinVariant: "blue_witch__v2_emerald" }, { type: "Bandit", count: 2, rarity: "rare" }] },
  ],
  // order 5 — Woodcutter's Camp (mid-boss)
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common", skinVariant: "soldier__v2_emerald" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Wild Boar", count: 1, rarity: "boss", skinVariant: "orc__v1_crimson" }] },
  ],
  // order 6 — Sacred Grove
  [
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Necromancer", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Necromancer", count: 3, rarity: "rare", skinVariant: "necromancer_1_emerald" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Necromancer", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "boss", skinVariant: "blue_witch__v2_emerald" }] },
  ],
  // order 7 — Bandit Hideout
  [
    { monsters: [{ type: "Bandit", count: 3, rarity: "common" }, { type: "Ronin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Ronin", count: 1, rarity: "boss", skinVariant: "ronin_enemy__v2_emerald" }] },
  ],
  // order 8 — Meadow's End (act boss)
  [
    { monsters: [{ type: "Forest Spirit", count: 4, rarity: "common" }, { type: "Necromancer", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Forest Spirit", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Necromancer", count: 2, rarity: "epic", skinVariant: "necromancer_1_crimson" }, { type: "Ronin", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Necromancer", count: 1, rarity: "boss", skinVariant: "necromancer_1_crimson" }] },
  ],
  // order 9 — Hidden Glade (side)
  [
    { monsters: [{ type: "Forest Spirit", count: 5, rarity: "common", skinVariant: "blue_witch__v5_violet" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "rare", skinVariant: "blue_witch__v5_violet" }, { type: "Wild Boar", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 2, rarity: "epic" }, { type: "Necromancer", count: 1, rarity: "epic" }] },
  ],
  // order 10 — Shepherd's Watch (side boss)
  [
    { monsters: [{ type: "Bandit", count: 5, rarity: "common" }, { type: "Wild Boar", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "rare", skinVariant: "orc__v2_emerald" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss", skinVariant: "king__v2_emerald" }] },
  ],
];

/* ── ACT 3: The Fields ─── Ronin, Ninja, Wild Boar, Dark Knight — Boss: Oni (shadow) */
const ACT3_WAVES: Wave[][] = [
  // order 1 — Open Steppe
  [
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "common", skinVariant: "orc__v1_crimson" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 2, rarity: "rare" }, { type: "Ninja", count: 3, rarity: "common", skinVariant: "ninja_crimson" }] },
    { monsters: [{ type: "Ronin", count: 1, rarity: "epic" }] },
  ],
  // order 2 — Scorched Farmland
  [
    { monsters: [{ type: "Bandit", count: 3, rarity: "common", skinVariant: "soldier__v1_crimson" }, { type: "Ninja", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Ninja", count: 2, rarity: "rare", skinVariant: "ninja_crimson" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dark Knight", count: 1, rarity: "epic" }] },
  ],
  // order 3 — Windswept Plateau
  [
    { monsters: [{ type: "Ronin", count: 4, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "common" }, { type: "Ronin", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 2, rarity: "rare" }, { type: "Dark Knight", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dark Knight", count: 1, rarity: "epic", skinVariant: "knight_enemy__v1_crimson" }] },
  ],
  // order 4 — Dry Riverbed
  [
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "common" }, { type: "Ronin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Wild Boar", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "epic" }, { type: "Ronin", count: 2, rarity: "rare" }] },
  ],
  // order 5 — Nomad Encampment (mid-boss)
  [
    { monsters: [{ type: "Ninja", count: 4, rarity: "common" }, { type: "Ronin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Dark Knight", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss", skinVariant: "king__v1_crimson" }] },
  ],
  // order 6 — Stone Ruins
  [
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "common", skinVariant: "knight_enemy__v1_crimson" }, { type: "Oni", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "boss", skinVariant: "necromancer_2__v1_crimson" }] },
  ],
  // order 7 — Warlord's Camp
  [
    { monsters: [{ type: "Oni", count: 3, rarity: "common" }, { type: "Tengu", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "boss", skinVariant: "paladin__v1_crimson" }] },
  ],
  // order 8 — Mountain Gate (act boss)
  [
    { monsters: [{ type: "Ronin", count: 4, rarity: "common" }, { type: "Oni", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Dragon", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss", skinVariant: "striker__v7_shadow" }] },
  ],
  // order 9 — Hidden Oasis (side)
  [
    { monsters: [{ type: "Wild Boar", count: 5, rarity: "common", skinVariant: "orc__v3_azure" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "rare" }, { type: "Wild Boar", count: 2, rarity: "rare", skinVariant: "orc__v3_azure" }] },
    { monsters: [{ type: "Forest Spirit", count: 2, rarity: "epic", skinVariant: "blue_witch__v3_azure" }, { type: "Ronin", count: 1, rarity: "epic" }] },
  ],
  // order 10 — Mercenary Outpost (side boss)
  [
    { monsters: [{ type: "Bandit", count: 5, rarity: "common", skinVariant: "soldier__v1_crimson" }, { type: "Ronin", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 4, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 3, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss", skinVariant: "king__v7_shadow" }] },
  ],
];

/* ── ACT 4: Snow Mountain ─── Forest Spirit (frost), Tengu, Night Born — Boss: Dragon (frost) */
const ACT4_WAVES: Wave[][] = [
  // order 1 — Frozen Trail
  [
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "common", skinVariant: "orc__v6_frost" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common", skinVariant: "blue_witch__v6_frost" }, { type: "Wild Boar", count: 2, rarity: "common", skinVariant: "orc__v6_frost" }] },
    { monsters: [{ type: "Forest Spirit", count: 2, rarity: "rare", skinVariant: "blue_witch__v6_frost" }, { type: "Goblin", count: 3, rarity: "common", skinVariant: "goblin_frost" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic", skinVariant: "blue_witch__v6_frost" }] },
  ],
  // order 2 — Ice Bridge
  [
    { monsters: [{ type: "Night Born", count: 3, rarity: "common" }, { type: "Forest Spirit", count: 3, rarity: "common", skinVariant: "blue_witch__v6_frost" }] },
    { monsters: [{ type: "Night Born", count: 2, rarity: "rare", skinVariant: "night_born_frost" }, { type: "Forest Spirit", count: 2, rarity: "rare", skinVariant: "blue_witch__v6_frost" }] },
    { monsters: [{ type: "Night Born", count: 1, rarity: "epic" }] },
  ],
  // order 3 — Blizzard Pass
  [
    { monsters: [{ type: "Night Born", count: 4, rarity: "common", skinVariant: "night_born_frost" }, { type: "Ninja", count: 2, rarity: "common", skinVariant: "ninja_frost" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "common" }, { type: "Night Born", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Ninja", count: 2, rarity: "rare", skinVariant: "ninja_frost" }, { type: "Tengu", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "epic" }] },
  ],
  // order 4 — Avalanche Valley
  [
    { monsters: [{ type: "Tengu", count: 4, rarity: "common" }, { type: "Night Born", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Night Born", count: 3, rarity: "rare" }, { type: "Tengu", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "epic", skinVariant: "necromancer_2__v6_frost" }, { type: "Night Born", count: 2, rarity: "rare" }] },
  ],
  // order 5 — Yeti's Domain (mid-boss)
  [
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "common", skinVariant: "orc__v6_frost" }, { type: "Night Born", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Night Born", count: 3, rarity: "rare" }, { type: "Wild Boar", count: 2, rarity: "rare", skinVariant: "orc__v6_frost" }] },
    { monsters: [{ type: "Night Born", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Wild Boar", count: 1, rarity: "boss", skinVariant: "orc__v6_frost" }] },
  ],
  // order 6 — Frost Temple
  [
    { monsters: [{ type: "Night Born", count: 3, rarity: "common", skinVariant: "night_born_azure" }, { type: "Necromancer", count: 2, rarity: "common", skinVariant: "necromancer_1_frost" }] },
    { monsters: [{ type: "Necromancer", count: 3, rarity: "rare", skinVariant: "necromancer_1_frost" }, { type: "Night Born", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Necromancer", count: 2, rarity: "epic", skinVariant: "necromancer_1_frost" }] },
    { monsters: [{ type: "Necromancer", count: 1, rarity: "boss", skinVariant: "necromancer_1_frost" }] },
  ],
  // order 7 — Dragon's Peak
  [
    { monsters: [{ type: "Tengu", count: 3, rarity: "common" }, { type: "Dragon", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Dragon", count: 3, rarity: "rare" }, { type: "Tengu", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "boss", skinVariant: "paladin__v6_frost" }] },
  ],
  // order 8 — Summit Fortress (act boss)
  [
    { monsters: [{ type: "Night Born", count: 4, rarity: "common" }, { type: "Tengu", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 3, rarity: "rare" }, { type: "Night Born", count: 1, rarity: "rare", skinVariant: "night_born_frost" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic", skinVariant: "paladin__v6_frost" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss", skinVariant: "striker__v6_frost" }] },
  ],
  // order 9 — Crystal Cavern (side)
  [
    { monsters: [{ type: "Night Born", count: 5, rarity: "common", skinVariant: "night_born_azure" }] },
    { monsters: [{ type: "Night Born", count: 3, rarity: "rare", skinVariant: "night_born_azure" }, { type: "Forest Spirit", count: 2, rarity: "rare", skinVariant: "blue_witch__v3_azure" }] },
    { monsters: [{ type: "Night Born", count: 2, rarity: "epic", skinVariant: "night_born_azure" }, { type: "Tengu", count: 1, rarity: "epic", skinVariant: "necromancer_2__v3_azure" }] },
  ],
  // order 10 — Frozen Shrine (side boss)
  [
    { monsters: [{ type: "Forest Spirit", count: 5, rarity: "common", skinVariant: "blue_witch__v6_frost" }, { type: "Night Born", count: 3, rarity: "common", skinVariant: "night_born_frost" }] },
    { monsters: [{ type: "Night Born", count: 4, rarity: "rare", skinVariant: "night_born_frost" }, { type: "Forest Spirit", count: 2, rarity: "rare", skinVariant: "blue_witch__v6_frost" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "epic", skinVariant: "necromancer_2__v6_frost" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "boss", skinVariant: "necromancer_2__v6_frost" }] },
  ],
];

/* ── ACT 5: The Depths ─── Reaper, Night Born (shadow), Necromancer (violet) — Boss: Shogun (golden) */
const ACT5_WAVES: Wave[][] = [
  // order 1 — Cave Mouth
  [
    { monsters: [{ type: "Night Born", count: 4, rarity: "common", skinVariant: "night_born_shadow" }] },
    { monsters: [{ type: "Goblin", count: 3, rarity: "common", skinVariant: "goblin_shadow" }, { type: "Night Born", count: 2, rarity: "common", skinVariant: "night_born_shadow" }] },
    { monsters: [{ type: "Night Born", count: 2, rarity: "rare", skinVariant: "night_born_shadow" }, { type: "Goblin", count: 3, rarity: "common", skinVariant: "goblin_shadow" }] },
    { monsters: [{ type: "Night Born", count: 1, rarity: "epic", skinVariant: "night_born_shadow" }] },
  ],
  // order 2 — Crystal Tunnels
  [
    { monsters: [{ type: "Night Born", count: 3, rarity: "common", skinVariant: "night_born_violet" }, { type: "Necromancer", count: 3, rarity: "common", skinVariant: "necromancer_1_violet" }] },
    { monsters: [{ type: "Necromancer", count: 2, rarity: "rare", skinVariant: "necromancer_1_violet" }, { type: "Night Born", count: 2, rarity: "rare", skinVariant: "night_born_violet" }] },
    { monsters: [{ type: "Necromancer", count: 1, rarity: "epic", skinVariant: "necromancer_1_violet" }] },
  ],
  // order 3 — Underground River
  [
    { monsters: [{ type: "Reaper", count: 4, rarity: "common" }, { type: "Night Born", count: 2, rarity: "common", skinVariant: "night_born_shadow" }] },
    { monsters: [{ type: "Necromancer", count: 3, rarity: "common", skinVariant: "necromancer_1_shadow" }, { type: "Reaper", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Night Born", count: 2, rarity: "rare", skinVariant: "night_born_shadow" }, { type: "Reaper", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Reaper", count: 1, rarity: "epic", skinVariant: "reaper__v5_violet" }] },
  ],
  // order 4 — Fungal Grotto
  [
    { monsters: [{ type: "Necromancer", count: 4, rarity: "common", skinVariant: "necromancer_1_emerald" }, { type: "Night Born", count: 2, rarity: "common", skinVariant: "night_born_emerald" }] },
    { monsters: [{ type: "Night Born", count: 3, rarity: "rare", skinVariant: "night_born_emerald" }, { type: "Necromancer", count: 2, rarity: "rare", skinVariant: "necromancer_1_emerald" }] },
    { monsters: [{ type: "Necromancer", count: 1, rarity: "epic", skinVariant: "necromancer_1_emerald" }, { type: "Reaper", count: 2, rarity: "rare" }] },
  ],
  // order 5 — Bone Chamber (mid-boss)
  [
    { monsters: [{ type: "Reaper", count: 4, rarity: "common" }, { type: "Night Born", count: 2, rarity: "common", skinVariant: "night_born_shadow" }] },
    { monsters: [{ type: "Reaper", count: 3, rarity: "rare", skinVariant: "reaper__v7_shadow" }, { type: "Necromancer", count: 2, rarity: "rare", skinVariant: "necromancer_1_shadow" }] },
    { monsters: [{ type: "Reaper", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Reaper", count: 1, rarity: "boss", skinVariant: "reaper__v5_violet" }] },
  ],
  // order 6 — Lava Vein
  [
    { monsters: [{ type: "Oni", count: 3, rarity: "common", skinVariant: "king__v1_crimson" }, { type: "Dragon", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Dragon", count: 3, rarity: "rare", skinVariant: "paladin__v1_crimson" }, { type: "Oni", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "boss", skinVariant: "paladin__v1_crimson" }] },
  ],
  // order 7 — Abyssal Rift
  [
    { monsters: [{ type: "Reaper", count: 3, rarity: "common", skinVariant: "reaper__v7_shadow" }, { type: "Tengu", count: 2, rarity: "common", skinVariant: "necromancer_2__v7_shadow" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare", skinVariant: "necromancer_2__v7_shadow" }, { type: "Reaper", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Reaper", count: 2, rarity: "epic", skinVariant: "reaper__v7_shadow" }] },
    { monsters: [{ type: "Dark Knight", count: 1, rarity: "boss", skinVariant: "knight_enemy__v5_violet" }] },
  ],
  // order 8 — Heart of the Mountain (act boss)
  [
    { monsters: [{ type: "Reaper", count: 4, rarity: "common" }, { type: "Dragon", count: 2, rarity: "rare", skinVariant: "paladin__v7_shadow" }] },
    { monsters: [{ type: "Dark Knight", count: 3, rarity: "rare", skinVariant: "knight_enemy__v7_shadow" }, { type: "Reaper", count: 1, rarity: "rare", skinVariant: "reaper__v5_violet" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic", skinVariant: "paladin__v7_shadow" }, { type: "Reaper", count: 1, rarity: "epic", skinVariant: "reaper__v7_shadow" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss", skinVariant: "striker__v4_golden" }] },
  ],
  // order 9 — Hidden Grotto (side)
  [
    { monsters: [{ type: "Necromancer", count: 5, rarity: "common", skinVariant: "necromancer_1_golden" }] },
    { monsters: [{ type: "Necromancer", count: 3, rarity: "rare", skinVariant: "necromancer_1_golden" }, { type: "Reaper", count: 2, rarity: "rare", skinVariant: "reaper__v4_golden" }] },
    { monsters: [{ type: "Reaper", count: 2, rarity: "epic", skinVariant: "reaper__v4_golden" }, { type: "Necromancer", count: 1, rarity: "epic", skinVariant: "necromancer_1_golden" }] },
  ],
  // order 10 — Poison Depths (side boss)
  [
    { monsters: [{ type: "Night Born", count: 5, rarity: "common", skinVariant: "night_born_emerald" }, { type: "Necromancer", count: 3, rarity: "common", skinVariant: "necromancer_1_emerald" }] },
    { monsters: [{ type: "Necromancer", count: 4, rarity: "rare", skinVariant: "necromancer_1_emerald" }, { type: "Night Born", count: 2, rarity: "rare", skinVariant: "night_born_emerald" }] },
    { monsters: [{ type: "Reaper", count: 3, rarity: "epic", skinVariant: "reaper__v2_emerald" }] },
    { monsters: [{ type: "Reaper", count: 1, rarity: "boss", skinVariant: "reaper__v2_emerald" }] },
  ],
];

/** Per-act wave tables (index 0 = act 1, etc.) */
const ACT_WAVE_TABLES: Wave[][][] = [ACT1_WAVES, ACT2_WAVES, ACT3_WAVES, ACT4_WAVES, ACT5_WAVES];

/** Base rewards per order slot — defined in balance.ts */

/**
 * Requirement pattern for 10 locations within an act.
 * Index = order-1, value = order of required location (0 = none).
 * Orders 1-8: linear chain.  Order 9 requires order 3.  Order 10 requires order 5.
 */
const REQUIREMENT_PATTERN: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 3, 5];

/**
 * Background image map — each act has an array of images.
 * Locations within an act cycle through these images by order index.
 */
export const ACT_BACKGROUNDS: Record<number, string[]> = {
  1: [
    "/assets/background/castle/img.png",
    "/assets/background/castle/img_1.png",
    "/assets/background/castle/img_2.png",
  ],
  2: [
    "/assets/background/meadow/meadov_with_castle.png",
    "/assets/background/meadow/meadov_with_trees.png",
    "/assets/background/meadow/meadov.png",
  ],
  3: [
    "/assets/background/fields/field_empty.png",
    "/assets/background/fields/field.png",
    "/assets/background/fields/field_with_moountain.png",
  ],
  4: [
    "/assets/background/snow_mountain/background_1.png",
    "/assets/background/snow_mountain/background_2.png",
    "/assets/background/snow_mountain/background_3.png",
    "/assets/background/snow_mountain/background_4.png",
  ],
  5: [
    "/assets/background/cave/alicia-magistrello-basic-cave.jpg",
    "/assets/background/cave/alicia-magistrello-crystal-cave.jpg",
    "/assets/background/cave/alicia-magistrello-poisonous-cave.jpg",
  ],
};

/**
 * Get background image path for a location based on its act and order.
 * Cycles through available images for the act.
 */
export function getBackgroundForLocation(location: Location): string {
  const images = ACT_BACKGROUNDS[location.act] || ACT_BACKGROUNDS[1];
  return images[(location.order - 1) % images.length];
}

/* ── Per-act location definitions (name + description only) ── */

interface LocationData {
  name: string;
  description: string;
}

const ACT_LOCATION_DATA: LocationData[][] = [
  // ─── Act 1: Castle ───
  [
    { name: "Castle Gate",         description: "Massive stone gates loom ahead. Guards patrol the battlements." },
    { name: "Outer Ward",          description: "The courtyard buzzes with soldiers. Steel clashes against steel." },
    { name: "Dungeon Entrance",    description: "Iron bars and chains. Screams echo from below." },
    { name: "Armory Hall",         description: "Weapons line the walls. Someone has been arming an army." },
    { name: "Servants Quarters",   description: "Abandoned rooms. Overturned tables and signs of a struggle." },
    { name: "Grand Hall",          description: "Towering pillars and faded banners. A throne sits empty." },
    { name: "Tower Ascent",        description: "Spiral stairs wind upward. Each floor holds new dangers." },
    { name: "Shogun's Chamber",    description: "The final room. The Shogun awaits atop his stolen throne." },
    { name: "Hidden Treasury",     description: "A secret vault behind the walls, guarded by elite sentries." },
    { name: "Castle Dungeon",      description: "The deepest cells. Something ancient stirs in the darkness." },
  ],
  // ─── Act 2: Meadow ───
  [
    { name: "Castle Outskirts",    description: "The castle fades behind you. Open meadows stretch ahead." },
    { name: "Flower Fields",       description: "Beautiful yet treacherous. Enemies hide among tall grass." },
    { name: "Old Mill",            description: "A ruined windmill creaks in the breeze. Bandits made it their den." },
    { name: "Riverside Path",      description: "The stream runs red. Ambush territory." },
    { name: "Woodcutter's Camp",   description: "Abandoned tents and cold fires. The woodcutters fled in haste." },
    { name: "Sacred Grove",        description: "Ancient trees tower above. Spirits guard this place." },
    { name: "Bandit Hideout",      description: "A fortified camp in the meadow. Their leader awaits inside." },
    { name: "Meadow's End",        description: "The grass gives way to rocky ground. The frontier beckons." },
    { name: "Hidden Glade",        description: "A secret clearing. Rare creatures dwell among the wildflowers." },
    { name: "Shepherd's Watch",    description: "An old watchtower overlooking the plains. Now a raider outpost." },
  ],
  // ─── Act 3: Fields ───
  [
    { name: "Open Steppe",         description: "Endless plains under a wide sky. Nowhere to hide." },
    { name: "Scorched Farmland",   description: "Burned crops and ruined barns. War has passed through here." },
    { name: "Windswept Plateau",   description: "The wind never stops. It carries the sound of distant battles." },
    { name: "Dry Riverbed",        description: "Cracked earth where water once flowed. Beasts lurk in the gullies." },
    { name: "Nomad Encampment",    description: "Tents torn apart. The nomads didn't leave willingly." },
    { name: "Stone Ruins",         description: "Ancient pillars jut from the earth. A forgotten civilization." },
    { name: "Warlord's Camp",      description: "Battle standards fly. The warlord commands from his war tent." },
    { name: "Mountain Gate",       description: "The fields end at towering cliffs. A narrow pass leads up." },
    { name: "Hidden Oasis",        description: "A miraculous spring in the barren fields. Fiercely contested." },
    { name: "Mercenary Outpost",   description: "Sell-swords for hire. Cross them and pay with your life." },
  ],
  // ─── Act 4: Snow Mountain ───
  [
    { name: "Frozen Trail",        description: "Snow blankets everything. Each step crunches underfoot." },
    { name: "Ice Bridge",          description: "A precarious span of frozen water over a deep chasm." },
    { name: "Blizzard Pass",       description: "Visibility drops to nothing. Enemies emerge from the whiteout." },
    { name: "Avalanche Valley",    description: "Snow rumbles above. One wrong move triggers disaster." },
    { name: "Yeti's Domain",       description: "Massive footprints in the snow. Something enormous lives here." },
    { name: "Frost Temple",        description: "An ice-encrusted shrine. Ancient power pulses within." },
    { name: "Dragon's Peak",       description: "The summit is scorched black. A dragon nests among the ice." },
    { name: "Summit Fortress",     description: "A stronghold carved from the mountaintop. The final ascent." },
    { name: "Crystal Cavern",      description: "Ice crystals glow with inner light. Rare treasures lie within." },
    { name: "Frozen Shrine",       description: "A sacred place encased in eternal ice. Spirits guard it still." },
  ],
  // ─── Act 5: Cave ───
  [
    { name: "Cave Mouth",          description: "Darkness swallows the light. The descent begins." },
    { name: "Crystal Tunnels",     description: "Glowing crystals light the path. Their beauty is deceptive." },
    { name: "Underground River",   description: "Black water rushes through the cavern. The current is deadly." },
    { name: "Fungal Grotto",       description: "Giant mushrooms pulse with toxic spores. The air burns." },
    { name: "Bone Chamber",        description: "The floor is covered in bones. Countless have perished here." },
    { name: "Lava Vein",           description: "Magma flows through cracks in the stone. The heat is unbearable." },
    { name: "Abyssal Rift",        description: "A chasm with no bottom. Whispers rise from the darkness." },
    { name: "Heart of the Mountain",description: "The deepest chamber. An ancient evil awaits its challenger." },
    { name: "Hidden Grotto",       description: "A secret cavern filled with crystallized treasures." },
    { name: "Poison Depths",       description: "Green mist seeps from the walls. Every breath is agony." },
  ],
];

/** Act display names (no "Act N:" prefix — tabs show short zone names). */
const ACT_NAMES: string[] = [
  "The Castle",
  "Open Meadow",
  "The Fields",
  "Snow Mountain",
  "The Depths",
];

/**
 * Act modifiers — applied as permanent ActiveEffects during location combat.
 * Each modifier maps to a concrete combat stat via { stat, target, value }.
 *
 * Supported stats:
 *   self: 'damage' (% tap dmg), 'critChance', 'dodge', 'armor' (flat), 'damageTaken' (% incoming)
 *   enemy: 'allVulnerability', 'physicalVulnerability', 'magicVulnerability'
 *
 * Difficulty curve: Act 1 net buff → Act 5 net debuff.
 */
export const ACT_MODIFIERS: Record<number, ActModifier[]> = {
  /* ── Act 1 — The Castle (easy, 2 buffs / 1 mild debuff) ── */
  1: [
    { icon: "\uD83D\uDEE1\uFE0F", name: "Castle Walls",  description: "+10 armor from stone fortifications",    type: "buff",   stat: "armor",       target: "self",  value: 10 },
    { icon: "\u2694\uFE0F",         name: "Armory Access", description: "+5% tap damage from nearby weapons",     type: "buff",   stat: "damage",      target: "self",  value: 0.05 },
    { icon: "\uD83D\uDD76\uFE0F",  name: "Dim Corridors", description: "+3% incoming damage in dark rooms",      type: "debuff", stat: "damageTaken", target: "self",  value: 0.03 },
  ],

  /* ── Act 2 — Open Meadow (balanced, 2 buffs / 1 debuff) ── */
  2: [
    { icon: "\uD83C\uDF3F",         name: "Nature's Blessing", description: "+3% dodge from fresh meadow air",   type: "buff",   stat: "dodge",       target: "self",  value: 0.03 },
    { icon: "\u2600\uFE0F",         name: "Open Sky",          description: "+3% crit chance in clear weather",   type: "buff",   stat: "critChance",  target: "self",  value: 0.03 },
    { icon: "\uD83D\uDC1B",         name: "Insect Swarm",      description: "+5% incoming damage from bites",     type: "debuff", stat: "damageTaken", target: "self",  value: 0.05 },
  ],

  /* ── Act 3 — The Fields (harder, 2 buffs / 2 debuffs) ── */
  3: [
    { icon: "\uD83D\uDCA8",         name: "Tailwind",       description: "+5% tap damage from favorable winds",          type: "buff",   stat: "damage",              target: "self",  value: 0.05 },
    { icon: "\u2600\uFE0F",         name: "Scorching Heat", description: "Enemies take +5% more elemental damage",       type: "buff",   stat: "magicVulnerability",  target: "enemy", value: 0.05 },
    { icon: "\uD83C\uDF2A\uFE0F",   name: "Dust Storm",     description: "-5% crit chance from poor visibility",         type: "debuff", stat: "critChance",          target: "self",  value: -0.05 },
    { icon: "\uD83E\uDEA8",         name: "Rocky Terrain",  description: "-3% dodge on uneven ground",                   type: "debuff", stat: "dodge",               target: "self",  value: -0.03 },
  ],

  /* ── Act 4 — Snow Mountain (hard, 1 buff / 3 debuffs) ── */
  4: [
    { icon: "\u2744\uFE0F",         name: "Frost Armor",  description: "+15 armor from cold-hardened resolve",          type: "buff",   stat: "armor",       target: "self", value: 15 },
    { icon: "\u2744\uFE0F",         name: "Frostbite",    description: "-8% tap damage from extreme cold",              type: "debuff", stat: "damage",      target: "self", value: -0.08 },
    { icon: "\uD83C\uDF28\uFE0F",   name: "Blizzard",     description: "-5% dodge in heavy snowfall",                   type: "debuff", stat: "dodge",       target: "self", value: -0.05 },
    { icon: "\u26F0\uFE0F",         name: "Thin Air",     description: "+5% incoming damage at high altitude",          type: "debuff", stat: "damageTaken", target: "self", value: 0.05 },
  ],

  /* ── Act 5 — The Depths (brutal, 1 buff / 3 debuffs) ── */
  5: [
    { icon: "\uD83D\uDD2E",         name: "Crystal Glow",  description: "+8% crit chance from crystal refraction",      type: "buff",   stat: "critChance",  target: "self", value: 0.08 },
    { icon: "\uD83D\uDD25",         name: "Lava Veins",    description: "+8% incoming damage from magma heat",          type: "debuff", stat: "damageTaken", target: "self", value: 0.08 },
    { icon: "\uD83E\uDD87",         name: "Cave Darkness", description: "-3% dodge in total darkness",                  type: "debuff", stat: "dodge",       target: "self", value: -0.03 },
    { icon: "\u2620\uFE0F",         name: "Toxic Fumes",   description: "-5% tap damage from noxious gas",              type: "debuff", stat: "damage",      target: "self", value: -0.05 },
  ],
};

/**
 * Get modifiers for an act (applied in combat via ActiveEffects).
 */
export function getActModifiers(actNumber: number): ActModifier[] {
  return ACT_MODIFIERS[actNumber] || [];
}

/* ── Build location & act data ───────────────────────────── */

/**
 * Generate a base ID from location name: lowercase, spaces → underscores.
 */
function nameToBaseId(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "_");
}

/**
 * Build all locations for a single act.
 */
function buildActLocations(actNumber: number): Location[] {
  const data = ACT_LOCATION_DATA[actNumber - 1];
  const prefix = `act${actNumber}_`;

  return data.map((loc, i) => {
    const order = i + 1;
    const baseId = nameToBaseId(loc.name);
    const id = prefix + baseId;

    // Requirement: look up the required order from the pattern
    const reqOrder = REQUIREMENT_PATTERN[i];
    let requiredLocationId: string | null = null;
    if (reqOrder > 0) {
      const reqBaseId = nameToBaseId(data[reqOrder - 1].name);
      requiredLocationId = prefix + reqBaseId;
    }

    const actWaves = ACT_WAVE_TABLES[actNumber - 1] || ACT_WAVE_TABLES[0];

    return {
      id,
      name: loc.name,
      description: loc.description,
      order,
      act: actNumber,
      requiredLocationId,
      waves: actWaves[i],
      rewards: B.LOCATION_REWARDS[i],
    };
  });
}

/** Array of act definitions: { act, name, locations[] } */
export const ACT_DEFINITIONS: ActDefinition[] = ACT_NAMES.map((name, i) => ({
  act: i + 1,
  name,
  locations: buildActLocations(i + 1),
}));

/** Total number of acts. */
export const TOTAL_ACTS: number = ACT_DEFINITIONS.length;

/** Flat array of all 50 locations. */
export const ALL_LOCATIONS: Location[] = ACT_DEFINITIONS.flatMap((a) => a.locations);

/* ── Lookup helpers ──────────────────────────────────────── */

/**
 * Get a location by ID.
 */
export function getLocationById(id: string): Location | undefined {
  return ALL_LOCATIONS.find((loc) => loc.id === id);
}

/**
 * Get all locations for a given act number.
 */
export function getLocationsForAct(actNumber: number): Location[] {
  const def = ACT_DEFINITIONS.find((a) => a.act === actNumber);
  return def ? def.locations : [];
}

/**
 * Get the 8 main-chain location IDs for a given act (orders 1-8).
 */
export function getMainChainIds(actNumber: number): string[] {
  return getLocationsForAct(actNumber)
    .filter((loc) => loc.order <= 8)
    .map((loc) => loc.id);
}

/**
 * Check if all 8 main-chain locations of an act are completed.
 */
export function isActComplete(actNumber: number, completedIds: string[]): boolean {
  return getMainChainIds(actNumber).every((id) => completedIds.includes(id));
}

/**
 * Get the highest act number the player has access to (1-5).
 * Act N+1 unlocks when Act N's main chain is complete.
 */
export function getHighestUnlockedAct(completedIds: string[]): number {
  for (let a = TOTAL_ACTS; a >= 2; a--) {
    if (isActComplete(a - 1, completedIds)) return a;
  }
  return 1;
}

/**
 * Get the "gate" location ID for an act — the last main-chain location (order 8).
 * Completing this location is the final requirement to unlock the next act.
 */
export function getActGateLocationId(actNumber: number): string | null {
  const locs = getLocationsForAct(actNumber);
  const gate = locs.find((loc) => loc.order === 8);
  return gate ? gate.id : null;
}

/**
 * Get rewards scaled by act multiplier.
 */
export function getScaledRewards(location: Location): { gold: number; xp: number } {
  const actMul = Math.pow(B.ACT_SCALING_BASE, (location.act || 1) - 1);
  return {
    gold: Math.floor(location.rewards.gold * actMul),
    xp: Math.floor(location.rewards.xp * actMul),
  };
}

/**
 * Get the display name of an act.
 */
export function getActName(actNumber: number): string {
  const def = ACT_DEFINITIONS.find((a) => a.act === actNumber);
  return def ? def.name : `Act ${actNumber}`;
}
