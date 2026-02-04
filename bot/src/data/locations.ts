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

/* ── Wave templates (reused across acts) ──────────────────── */

const WAVE_TEMPLATES: Wave[][] = [
  // order 1 — 4 waves, easy
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare" }, { type: "Bandit", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Bandit", count: 1, rarity: "epic" }] },
  ],
  // order 2 — 3 waves
  [
    { monsters: [{ type: "Bandit", count: 3, rarity: "common" }, { type: "Wild Boar", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 1, rarity: "epic" }] },
  ],
  // order 3 — 4 waves
  [
    { monsters: [{ type: "Wild Boar", count: 4, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Wild Boar", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Bandit", count: 2, rarity: "rare" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }] },
  ],
  // order 4 — 3 waves
  [
    { monsters: [{ type: "Forest Spirit", count: 4, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Wild Boar", count: 3, rarity: "rare" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }, { type: "Bandit", count: 2, rarity: "rare" }] },
  ],
  // order 5 — 4 waves, first boss
  [
    { monsters: [{ type: "Bandit", count: 4, rarity: "common" }, { type: "Ronin", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Ronin", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss" }] },
  ],
  // order 6 — 4 waves
  [
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Oni", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Tengu", count: 1, rarity: "boss" }] },
  ],
  // order 7 — 4 waves
  [
    { monsters: [{ type: "Oni", count: 3, rarity: "common" }, { type: "Tengu", count: 2, rarity: "common" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 2, rarity: "epic" }] },
    { monsters: [{ type: "Dragon", count: 1, rarity: "boss" }] },
  ],
  // order 8 — 4 waves, act boss
  [
    { monsters: [{ type: "Ronin", count: 4, rarity: "common" }, { type: "Oni", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Dragon", count: 1, rarity: "rare" }] },
    { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    { monsters: [{ type: "Shogun", count: 1, rarity: "boss" }] },
  ],
  // order 9 — 3 waves, side branch
  [
    { monsters: [{ type: "Forest Spirit", count: 5, rarity: "common" }] },
    { monsters: [{ type: "Forest Spirit", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Forest Spirit", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
  ],
  // order 10 — 4 waves, side branch boss
  [
    { monsters: [{ type: "Bandit", count: 5, rarity: "common" }, { type: "Ronin", count: 3, rarity: "common" }] },
    { monsters: [{ type: "Ronin", count: 4, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    { monsters: [{ type: "Oni", count: 3, rarity: "epic" }] },
    { monsters: [{ type: "Oni", count: 1, rarity: "boss" }] },
  ],
];

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
    "/src/assets/background/castle/img.png",
    "/src/assets/background/castle/img_1.png",
    "/src/assets/background/castle/img_2.png",
  ],
  2: [
    "/src/assets/background/meadow/meadov_with_castle.png",
    "/src/assets/background/meadow/meadov_with_trees.png",
    "/src/assets/background/meadow/meadov.png",
  ],
  3: [
    "/src/assets/background/fields/field_empty.png",
    "/src/assets/background/fields/field.png",
    "/src/assets/background/fields/field_with_moountain.png",
  ],
  4: [
    "/src/assets/background/snow_mountain/background_1.png",
    "/src/assets/background/snow_mountain/background_2.png",
    "/src/assets/background/snow_mountain/background_3.png",
    "/src/assets/background/snow_mountain/background_4.png",
  ],
  5: [
    "/src/assets/background/cave/alicia-magistrello-basic-cave.jpg",
    "/src/assets/background/cave/alicia-magistrello-crystal-cave.jpg",
    "/src/assets/background/cave/alicia-magistrello-poisonous-cave.jpg",
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
 * Visual buffs / debuffs per act (mock — cosmetic only, no gameplay effect yet).
 * Each entry: { icon, name, description, type: "buff"|"debuff" }
 */
export const ACT_MODIFIERS: Record<number, ActModifier[]> = {
  1: [
    { icon: "\uD83D\uDEE1\uFE0F", name: "Castle Walls",     description: "Stone walls reduce incoming ranged damage",   type: "buff" },
    { icon: "\u2694\uFE0F",         name: "Armory Access",    description: "Tap damage slightly increased",               type: "buff" },
    { icon: "\uD83D\uDD76\uFE0F",  name: "Dim Corridors",    description: "Enemy crit chance increased in dark rooms",    type: "debuff" },
  ],
  2: [
    { icon: "\uD83C\uDF3F",         name: "Nature's Blessing",description: "HP regeneration from fresh air",              type: "buff" },
    { icon: "\u2600\uFE0F",         name: "Open Sky",         description: "No ambush penalties — enemies visible early",  type: "buff" },
    { icon: "\uD83D\uDC1B",         name: "Insect Swarm",     description: "Periodic minor poison damage over time",       type: "debuff" },
  ],
  3: [
    { icon: "\uD83D\uDCA8",         name: "Tailwind",         description: "Movement speed buff — faster attack rate",     type: "buff" },
    { icon: "\u2600\uFE0F",         name: "Scorching Heat",   description: "Passive DPS ticks deal bonus fire damage",     type: "buff" },
    { icon: "\uD83C\uDF2A\uFE0F",   name: "Dust Storm",       description: "Reduced visibility — miss chance increased",   type: "debuff" },
    { icon: "\uD83E\uDEA8",         name: "Rocky Terrain",    description: "Dodge chance reduced on uneven ground",        type: "debuff" },
  ],
  4: [
    { icon: "\u2744\uFE0F",         name: "Frost Armor",      description: "Cold hardens your resolve — defense up",       type: "buff" },
    { icon: "\u2744\uFE0F",         name: "Frostbite",        description: "Extreme cold slows attack speed",              type: "debuff" },
    { icon: "\uD83C\uDF28\uFE0F",   name: "Blizzard",         description: "Periodic freeze chance on both sides",         type: "debuff" },
    { icon: "\u26F0\uFE0F",         name: "Thin Air",         description: "Stamina drains faster at high altitude",       type: "debuff" },
  ],
  5: [
    { icon: "\uD83D\uDD2E",         name: "Crystal Glow",     description: "Cave crystals boost crit multiplier",          type: "buff" },
    { icon: "\uD83D\uDD25",         name: "Lava Veins",       description: "Fire damage over time from magma fissures",    type: "debuff" },
    { icon: "\uD83E\uDDA7",         name: "Cave Darkness",    description: "Total darkness — high miss chance",            type: "debuff" },
    { icon: "\u2620\uFE0F",         name: "Toxic Fumes",      description: "Poison stacks slowly drain HP",                type: "debuff" },
  ],
};

/**
 * Get modifiers for an act (visual / mock).
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

    return {
      id,
      name: loc.name,
      description: loc.description,
      order,
      act: actNumber,
      requiredLocationId,
      waves: WAVE_TEMPLATES[i],
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
