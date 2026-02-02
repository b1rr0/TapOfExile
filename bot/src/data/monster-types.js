/**
 * Monster rarity tiers.
 * Each rarity defines a color, display label, and stat multipliers.
 */
export const RARITIES = {
  common:  { id: "common",  label: "Common",  color: "#9e9e9e", hpMul: 1.0, goldMul: 1.0, xpMul: 1.0 },
  rare:    { id: "rare",    label: "Rare",    color: "#4fc3f7", hpMul: 1.6, goldMul: 1.5, xpMul: 1.4 },
  epic:    { id: "epic",    label: "Epic",    color: "#ffd740", hpMul: 2.5, goldMul: 2.2, xpMul: 2.0 },
  boss:    { id: "boss",    label: "Boss",    color: "#ff9100", hpMul: 4.0, goldMul: 3.5, xpMul: 3.0 },
};

export const MONSTER_TYPES = [
  { name: "Bandit", cssClass: "monster-bandit", minStage: 1, bodyColor: "#8b6914", eyeColor: "#fff" },
  { name: "Wild Boar", cssClass: "monster-boar", minStage: 1, bodyColor: "#6b3a2a", eyeColor: "#ff4444" },
  { name: "Forest Spirit", cssClass: "monster-spirit", minStage: 3, bodyColor: "#2e7d32", eyeColor: "#aaffaa" },
  { name: "Ronin", cssClass: "monster-ronin", minStage: 5, bodyColor: "#4a4a6a", eyeColor: "#eee" },
  { name: "Oni", cssClass: "monster-oni", minStage: 8, bodyColor: "#c41e3a", eyeColor: "#ffcc00" },
  { name: "Tengu", cssClass: "monster-tengu", minStage: 12, bodyColor: "#1a237e", eyeColor: "#ff6600" },
  { name: "Dragon", cssClass: "monster-dragon", minStage: 15, bodyColor: "#4a0072", eyeColor: "#ff0000" },
  { name: "Shogun", cssClass: "monster-shogun", minStage: 20, bodyColor: "#b8860b", eyeColor: "#fff" },
];
