/**
 * Character Classes — maps each playable class to its sprite skin.
 *
 * classId  → unique key used in state & character objects
 * skinId   → key into HERO_SKINS (sprite-registry.js)
 */

export const CHARACTER_CLASSES = {
  samurai: {
    id: "samurai",
    name: "Samurai",
    skinId: "samurai_1",
    description: "Swift blade warrior",
    icon: "\u2694\uFE0F",
  },
  warrior: {
    id: "warrior",
    name: "Warrior",
    skinId: "knight_1",
    description: "Armored frontline fighter",
    icon: "\uD83D\uDEE1\uFE0F",
  },
  mage: {
    id: "mage",
    name: "Mage",
    skinId: "wizard_1",
    description: "Master of arcane arts",
    icon: "\uD83E\uDDD9",
  },
  archer: {
    id: "archer",
    name: "Archer",
    skinId: "archer_1",
    description: "Precision ranged attacker",
    icon: "\uD83C\uDFF9",
  },
};

export function getCharacterClass(classId) {
  return CHARACTER_CLASSES[classId];
}

export function listCharacterClasses() {
  return Object.values(CHARACTER_CLASSES);
}
