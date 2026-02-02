/**
 * Location catalog — 10 locations for Chapter 1.
 *
 * Each location defines:
 *  - id            unique string key
 *  - name          display name
 *  - description   short flavour text
 *  - order         sequence number (1-based), used for scaling
 *  - requiredLocationId  id of the location that must be completed first (null = always unlocked)
 *  - background    background key (for future per-location art)
 *  - waves         array of waves, each with monsters [{type, count, rarity}]
 *                  rarity: "common" | "rare" | "epic" | "boss"
 *  - rewards       { gold, xp } granted on completion
 */

export const LOCATIONS = [
  {
    id: "forest_road",
    name: "Forest Road",
    description: "A quiet path through ancient woods. Bandits lurk in the shadows.",
    order: 1,
    requiredLocationId: null,
    background: "forest",
    waves: [
      { monsters: [{ type: "Bandit", count: 4, rarity: "common" }] },
      { monsters: [{ type: "Wild Boar", count: 3, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare" }, { type: "Bandit", count: 3, rarity: "common" }] },
      { monsters: [{ type: "Bandit", count: 1, rarity: "epic" }] },
    ],
    rewards: { gold: 60, xp: 40 },
  },
  {
    id: "mountain_pass",
    name: "Mountain Pass",
    description: "A narrow trail along the cliffside. The wind howls.",
    order: 2,
    requiredLocationId: "forest_road",
    background: "mountain",
    waves: [
      { monsters: [{ type: "Bandit", count: 3, rarity: "common" }, { type: "Wild Boar", count: 3, rarity: "common" }] },
      { monsters: [{ type: "Wild Boar", count: 2, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Ronin", count: 1, rarity: "epic" }] },
    ],
    rewards: { gold: 100, xp: 65 },
  },
  {
    id: "dark_cave",
    name: "Dark Cave",
    description: "Damp stone walls echo with unnatural sounds.",
    order: 3,
    requiredLocationId: "mountain_pass",
    background: "cave",
    waves: [
      { monsters: [{ type: "Wild Boar", count: 4, rarity: "common" }, { type: "Bandit", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Wild Boar", count: 1, rarity: "rare" }] },
      { monsters: [{ type: "Bandit", count: 2, rarity: "rare" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }] },
    ],
    rewards: { gold: 140, xp: 95 },
  },
  {
    id: "swamp",
    name: "Swamp",
    description: "Thick fog blankets the marshland. Every step could be your last.",
    order: 4,
    requiredLocationId: "dark_cave",
    background: "swamp",
    waves: [
      { monsters: [{ type: "Forest Spirit", count: 4, rarity: "common" }, { type: "Wild Boar", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Wild Boar", count: 3, rarity: "rare" }, { type: "Forest Spirit", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Forest Spirit", count: 1, rarity: "epic" }, { type: "Bandit", count: 2, rarity: "rare" }] },
    ],
    rewards: { gold: 190, xp: 130 },
  },
  {
    id: "abandoned_village",
    name: "Abandoned Village",
    description: "Empty houses and overturned carts. Something drove the people away.",
    order: 5,
    requiredLocationId: "swamp",
    background: "village",
    waves: [
      { monsters: [{ type: "Bandit", count: 4, rarity: "common" }, { type: "Ronin", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Ronin", count: 3, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Ronin", count: 2, rarity: "epic" }] },
      { monsters: [{ type: "Oni", count: 1, rarity: "boss" }] },
    ],
    rewards: { gold: 260, xp: 180 },
  },
  {
    id: "cursed_temple",
    name: "Cursed Temple",
    description: "Dark energy radiates from crumbling torii gates.",
    order: 6,
    requiredLocationId: "abandoned_village",
    background: "temple",
    waves: [
      { monsters: [{ type: "Forest Spirit", count: 3, rarity: "common" }, { type: "Oni", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Oni", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Oni", count: 2, rarity: "epic" }] },
      { monsters: [{ type: "Tengu", count: 1, rarity: "boss" }] },
    ],
    rewards: { gold: 350, xp: 240 },
  },
  {
    id: "dragons_lair",
    name: "Dragon's Lair",
    description: "The air burns. Bones of fallen warriors litter the ground.",
    order: 7,
    requiredLocationId: "cursed_temple",
    background: "lair",
    waves: [
      { monsters: [{ type: "Oni", count: 3, rarity: "common" }, { type: "Tengu", count: 2, rarity: "common" }] },
      { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Oni", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Tengu", count: 2, rarity: "epic" }] },
      { monsters: [{ type: "Dragon", count: 1, rarity: "boss" }] },
    ],
    rewards: { gold: 450, xp: 320 },
  },
  {
    id: "shogun_castle",
    name: "Shogun Castle",
    description: "The final stronghold. Steel gates, armoured guards, and the Shogun awaits.",
    order: 8,
    requiredLocationId: "dragons_lair",
    background: "castle",
    waves: [
      { monsters: [{ type: "Ronin", count: 4, rarity: "common" }, { type: "Oni", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Tengu", count: 3, rarity: "rare" }, { type: "Dragon", count: 1, rarity: "rare" }] },
      { monsters: [{ type: "Dragon", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
      { monsters: [{ type: "Shogun", count: 1, rarity: "boss" }] },
    ],
    rewards: { gold: 600, xp: 450 },
  },
  {
    id: "hidden_shrine",
    name: "Hidden Shrine",
    description: "A secret place of power, guarded by ancient spirits.",
    order: 9,
    requiredLocationId: "dark_cave",
    background: "shrine",
    waves: [
      { monsters: [{ type: "Forest Spirit", count: 5, rarity: "common" }] },
      { monsters: [{ type: "Forest Spirit", count: 3, rarity: "rare" }, { type: "Ronin", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Forest Spirit", count: 2, rarity: "epic" }, { type: "Tengu", count: 1, rarity: "epic" }] },
    ],
    rewards: { gold: 300, xp: 220 },
  },
  {
    id: "bandit_fortress",
    name: "Bandit Fortress",
    description: "A walled hideout deep in the mountains. The bandits' last stand.",
    order: 10,
    requiredLocationId: "abandoned_village",
    background: "fortress",
    waves: [
      { monsters: [{ type: "Bandit", count: 5, rarity: "common" }, { type: "Ronin", count: 3, rarity: "common" }] },
      { monsters: [{ type: "Ronin", count: 4, rarity: "rare" }, { type: "Bandit", count: 2, rarity: "rare" }] },
      { monsters: [{ type: "Oni", count: 3, rarity: "epic" }] },
      { monsters: [{ type: "Oni", count: 1, rarity: "boss" }] },
    ],
    rewards: { gold: 420, xp: 300 },
  },
];

/**
 * Get a location by ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getLocationById(id) {
  return LOCATIONS.find((loc) => loc.id === id);
}
