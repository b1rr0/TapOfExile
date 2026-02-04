import type { Rarity, MonsterType } from "../types.js";
import { B } from "./balance.js";

/**
 * Monster rarity tiers.
 * Each rarity defines a color, display label, and stat multipliers (from balance.ts).
 */
export const RARITIES: Record<string, Rarity> = {
  common:  { id: "common",  label: "Common",  color: "#9e9e9e", ...B.RARITY_MULTIPLIERS.common },
  rare:    { id: "rare",    label: "Rare",    color: "#4fc3f7", ...B.RARITY_MULTIPLIERS.rare },
  epic:    { id: "epic",    label: "Epic",    color: "#ffd740", ...B.RARITY_MULTIPLIERS.epic },
  boss:    { id: "boss",    label: "Boss",    color: "#ff9100", ...B.RARITY_MULTIPLIERS.boss },
};

export const MONSTER_TYPES: MonsterType[] = [
  { name: "Bandit", cssClass: "monster-bandit", minStage: 1, bodyColor: "#8b6914", eyeColor: "#fff" },
  { name: "Wild Boar", cssClass: "monster-boar", minStage: 1, bodyColor: "#6b3a2a", eyeColor: "#ff4444" },
  { name: "Forest Spirit", cssClass: "monster-spirit", minStage: 3, bodyColor: "#2e7d32", eyeColor: "#aaffaa" },
  { name: "Ronin", cssClass: "monster-ronin", minStage: 5, bodyColor: "#4a4a6a", eyeColor: "#eee" },
  { name: "Oni", cssClass: "monster-oni", minStage: 8, bodyColor: "#c41e3a", eyeColor: "#ffcc00" },
  { name: "Tengu", cssClass: "monster-tengu", minStage: 12, bodyColor: "#1a237e", eyeColor: "#ff6600" },
  { name: "Dragon", cssClass: "monster-dragon", minStage: 15, bodyColor: "#4a0072", eyeColor: "#ff0000" },
  { name: "Shogun", cssClass: "monster-shogun", minStage: 20, bodyColor: "#b8860b", eyeColor: "#fff" },
];
