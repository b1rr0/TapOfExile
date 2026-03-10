/**
 * Populates empty-mod nodes in skill-tree-data.ts with balanced, themed stats.
 *
 * Rules (from BUGS.md / BUG-4):
 *  - Common (classSkill/minor): power 1 (regular) / power 2 (class shapes 419-422)
 *  - Medium (notable):          power 2 (regular) / power 4 (class shapes)
 *  - Strong (keystone):         power 5 (regular) / power 8 (class shapes)
 *
 *  - All stats within a single shape must share a sub-theme (damage, crit, tank, elemental, utility)
 *  - No crit chance + magic damage in the same shape
 *  - Closer to a class → stats match that class identity
 *  - Shapes 419-422 (figureEntry nodes at class-arc corners) → doubled power
 *
 * Usage:  npx tsx shared/populate-tree-nodes.ts
 */

/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";

// ── Types ─────────────────────────────────────────────────

interface Mod { stat: string; value: number; mode: string; }
interface RawNode {
  id: number; nodeId: string; type: string; classAffinity?: string;
  x: number; y: number; label?: string; name?: string | null;
  stat?: string | null; value?: number; defId?: string | null;
  activeSkillId?: string | null; mods?: Mod[]; connections: number[];
  connector?: boolean;
}

// ── Power-1 base values per stat ──────────────────────────

const BASE: Record<string, number> = {
  damage: 0.04, tapHit: 10, critChance: 0.03, critMulti: 0.08,
  hp: 0.10, armor: 0.08, lifeOnHit: 0.08, fireDmg: 0.05, lightningDmg: 0.05, coldDmg: 0.05,
  goldFind: 0.05, xpGain: 0.06,
  // Weapon-type multipliers (base 0.06 = +6% per power-1 node)
  swordDmg: 0.06, axeDmg: 0.06, daggerDmg: 0.06, wandDmg: 0.06,
  maceDmg: 0.06, bowDmg: 0.06, staffDmg: 0.06,
  // Warrior fortress (block + armor + thorns)
  blockChance: 0.03, thorns: 0.05,
  // Arcane crit (mage-only arcane crit chance/multiplier)
  arcaneCritChance: 0.03, arcaneCritMulti: 0.08,
  cooldownReduction: 0.02,
};

// figureEntry = power 1.5 (gateway), Notable = power 3, Keystone = power 5
const POWER_MULT: Record<string, number> = { figureEntry: 1.5, notable: 3, keystone: 5 };
// Class shape (figures containing nodes 419-422 gateways) = 1.6× boost
const CLASS_SHAPE_MULT = 1.6;

// ── Stat themes ───────────────────────────────────────────

type Theme = "damage" | "crit" | "tank" | "fire" | "lightning" | "cold" | "utility"
  | "allElemental" | "armor" | "mixed" | "arcane" | "fortress"
  | "wpn_sword" | "wpn_axe" | "wpn_dagger" | "wpn_wand" | "wpn_mace"
  | "wpn_bow" | "wpn_staff";

const THEME_STATS: Record<Theme, string[]> = {
  damage:       ["damage", "tapHit"],
  crit:         ["critChance", "critMulti"],
  tank:         ["hp", "lifeOnHit"],
  armor:        ["armor", "hp"],
  fire:         ["fireDmg", "damage"],
  lightning:    ["lightningDmg", "critChance"],
  cold:         ["coldDmg", "hp"],
  utility:      ["goldFind", "xpGain"],
  allElemental: ["fireDmg", "coldDmg", "lightningDmg"],    // capped at 0.20 each
  mixed:        ["damage", "hp", "critChance"],             // balanced mix
  // Weapon-type multipliers (1 stat each — pure weapon bonus)
  wpn_sword:    ["swordDmg"],
  wpn_axe:      ["axeDmg"],
  wpn_dagger:   ["daggerDmg"],
  wpn_wand:     ["wandDmg"],
  wpn_mace:     ["maceDmg"],
  wpn_bow:      ["bowDmg"],
  wpn_staff:    ["staffDmg"],
  arcane:       ["arcaneCritChance", "arcaneCritMulti", "cooldownReduction"],
  fortress:     ["armor", "blockChance", "thorns"],
};

// ── allElemental hard cap: 0.20 per element regardless of power level ──
const ALL_ELEMENTAL_CAP = 0.20;

const NOTABLE_NAMES: Partial<Record<Theme, string[]>> = {
  damage:       ["Razor Edge", "Blade Force", "Fury", "War Path"],
  crit:         ["Eagle Eye", "Sixth Sense", "Precision", "Sharp Wit"],
  tank:         ["Iron Skin", "Battle Hardened", "Fortify", "Endurance"],
  armor:        ["Bulwark", "Iron Bastion", "Steel Wall", "Aegis"],
  fire:         ["Pyre", "Inner Fire", "Ember Walk", "Flame Mastery"],
  lightning:    ["Storm Conduit", "Thunder Step", "Spark", "Voltage"],
  cold:         ["Frostbite", "Chill Touch", "Ice Vein", "Permafrost"],
  utility:      ["Fortune Seeker", "Quick Learner", "Greed", "Scholar"],
  allElemental: ["Elemental Mastery", "Prismatic Force", "Tri-Force", "Convergence"],
  mixed:        ["Balanced Strike", "Harmony", "Equilibrium", "Versatility"],
  wpn_sword:    ["Sword Mastery", "Blade Dancer", "Keen Edge", "Riposte"],
  wpn_axe:      ["Axe Mastery", "Cleave Master", "Rend", "Brutal Chop"],
  wpn_dagger:   ["Dagger Mastery", "Assassin's Edge", "Backstab", "Lethal Pierce"],
  wpn_wand:     ["Wand Mastery", "Spell Channel", "Arcane Focus", "Conduit"],
  wpn_mace:     ["Mace Mastery", "Crushing Blow", "Stagger", "Concussion"],
  wpn_bow:      ["Bow Mastery", "Dead Eye", "Long Shot", "Volley"],
  wpn_staff:    ["Staff Mastery", "Spell Amplifier", "Long Reach", "Focus Strike"],
  arcane:       ["Spell Precision", "Arcane Clarity", "Time Weave", "Mana Flux"],
  fortress:     ["Iron Guard", "Shield Wall", "Retribution", "Thorn Skin"],
};

const KEYSTONE_NAMES: Partial<Record<Theme, string[]>> = {
  damage:       ["World Destroyer", "Chaos Lord", "Berserker Rage", "Void Walker"],
  crit:         ["Perfect Aim", "Ghost Step", "Executioner", "Nightblade"],
  tank:         ["Iron Will", "Undying Will", "Oathkeeper", "Titan Grip"],
  armor:        ["Living Fortress", "Adamantine", "Unbreakable", "Stone Sentinel"],
  fire:         ["Pyromancer", "Infernal Crown", "Sunfire", "Dragon Breath"],
  lightning:    ["Thunder God", "Tempest Lord", "Voltage Surge", "Mjolnir"],
  cold:         ["Frost Emperor", "Blizzard Heart", "Avalanche", "Glacial Core"],
  utility:      ["Golden Age", "Eternal Student", "Midas Touch", "Grand Scholar"],
  allElemental: ["Elemental Nova", "Prism Lord", "Arcane Harmony", "Chaos Prism"],
  mixed:        ["Jack of All", "Omni Force", "Apex Balance", "Total War"],
  wpn_sword:    ["Sword Saint", "Blade Lord", "Master Fencer", "Excalibur"],
  wpn_axe:      ["Axe Lord", "Berserker King", "Executioner's Axe", "Reaver"],
  wpn_dagger:   ["Shadow Blade", "Assassin Lord", "Phantom Strike", "Viper Fang"],
  wpn_wand:     ["Archmage", "Wand Lord", "Spell Weaver", "Hex Master"],
  wpn_mace:     ["War Hammer", "Mace Lord", "Skull Crusher", "Thunder Maul"],
  wpn_bow:      ["Grand Archer", "Bow Lord", "Eagle Shot", "Storm Bow"],
  wpn_staff:    ["Grand Magus", "Staff Lord", "Arcane Conduit", "Sage Staff"],
  arcane:       ["Archmage's Domain", "Temporal Mastery", "Spell Lord", "Arcane Supremacy"],
  fortress:     ["Unbreakable Will", "Bastion Lord", "Thorned Fortress", "Iron Sentinel"],
};

// ── Class theme rotation ──────────────────────────────────
//
// 8 themes per class → with 13 figures each, ~1.6 figures per theme slot
// Each class gets: element(s) + weapon types + generic + allElemental
//
// Class identity:
//   Samurai  → physical + crits + sword/dagger
//   Warrior  → cold + tank + armor + axe/mace/shield
//   Mage     → fire + all elements + staff/wand
//   Archer   → lightning + crit + bow
const CLASS_THEME: Record<string, Theme[]> = {
  samurai: ["damage",    "crit",      "wpn_sword",  "wpn_dagger", "allElemental", "crit",      "damage",   "mixed"],
  warrior: ["cold",      "fortress",  "wpn_axe",    "wpn_mace",   "armor",        "armor",     "cold",     "tank"],
  mage:    ["fire",      "fire",      "arcane",     "wpn_wand",   "allElemental", "cold",      "lightning","wpn_staff"],
  archer:  ["lightning", "crit",      "wpn_bow",    "lightning",  "allElemental",  "damage",    "crit",     "mixed"],
};

// ── Seeded RNG ────────────────────────────────────────────

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Build mods for a node ─────────────────────────────────

// Progressive amp tiers for weapon notables (sum = 65% each)
// Farther from figure entry → stronger bonus
const WPN_AMP_TIERS: Record<number, number[]> = {
  1: [0.65],
  2: [0.25, 0.40],
  3: [0.15, 0.20, 0.30],
  4: [0.10, 0.15, 0.20, 0.20],
};

const WPN_LABEL: Record<string, string> = {
  sword: "Sword", axe: "Axe", dagger: "Dagger",
  wand: "Wand", mace: "Mace", bow: "Bow", staff: "Staff",
};

function buildMods(
  type: "notable" | "keystone" | "figureEntry",
  theme: Theme,
  isClassShape: boolean,
  rng: () => number,
  wpnAmpValue?: number,
  nodeId?: number,
): { mods: Mod[]; label: string; name: string | null } {
  const power = POWER_MULT[type] * (isClassShape ? CLASS_SHAPE_MULT : 1);
  const stats = THEME_STATS[theme];
  const names = (type === "keystone" ? KEYSTONE_NAMES[theme] : NOTABLE_NAMES[theme]) ?? ["Node"];

  // ── Weapon notables: progressive amp (enhance equipped weapon stats) ──
  if (type === "notable" && theme.startsWith("wpn_") && wpnAmpValue) {
    const wpnKey = theme.replace("wpn_", "");
    const ampStat = `${wpnKey}Amp`;
    const name = names[Math.floor(rng() * names.length)];
    const pctLabel = Math.round(wpnAmpValue * 100);
    const mods: Mod[] = [{ stat: ampStat, value: wpnAmpValue, mode: "percent" }];
    const label = `+${pctLabel}% ${WPN_LABEL[wpnKey] || wpnKey} Stats`;
    return { mods, label, name };
  }

  // allElemental always uses all 3 stats; figureEntry 1 stat; notable/keystone 1-2
  const statCount = theme === "allElemental" ? stats.length
    : type === "figureEntry" ? 1
    : type === "keystone" ? (rng() < 0.4 ? 2 : 1)
    : (rng() < 0.5 ? 2 : 1);

  // For themes with 3+ stats, rotate the array based on node ID for even coverage
  // (otherwise the 3rd stat is never picked since statCount caps at 2)
  let orderedStats = stats;
  if (stats.length > 2 && theme !== "allElemental") {
    const offset = (nodeId ?? 0) % stats.length;
    orderedStats = stats.map((_, i) => stats[(i + offset) % stats.length]);
  }

  const mods: Mod[] = [];
  const usedStats = new Set<string>();

  for (let i = 0; i < statCount && i < orderedStats.length; i++) {
    const stat = orderedStats[i];
    if (usedStats.has(stat)) continue;
    usedStats.add(stat);
    const base = BASE[stat] ?? 0.05;
    // Slight variance ±10%
    const variance = 1 + (rng() - 0.5) * 0.2;
    let value = Math.round(base * power * variance * 1000) / 1000;
    // allElemental: clamp each element to 20% max
    if (theme === "allElemental") {
      value = Math.min(value, ALL_ELEMENTAL_CAP);
    }
    const isFlat = stat === "tapHit";
    if (isFlat) {
      value = Math.round(value);
      value = Math.max(20, Math.min(50, value));
    }
    mods.push({ stat, value, mode: isFlat ? "flat" : "percent" });
  }

  const name = names[Math.floor(rng() * names.length)];
  // Special labels per theme type
  let label: string;
  if (theme === "allElemental") {
    label = `+${Math.round(mods[0]?.value * 100 || 20)}% All Elements`;
  } else if (theme.startsWith("wpn_")) {
    // Conditional weapon label: "+18% Dmg w/ Sword"
    const wpnKey = theme.replace("wpn_", "");
    const wpnName = WPN_LABEL[wpnKey] || wpnKey;
    label = mods.map(m => `+${Math.round(m.value * 100)}% Dmg w/ ${wpnName}`).join(", ");
  } else {
    label = mods.map(m => m.mode === "flat"
      ? `+${Math.round(m.value)} ${statLabel(m.stat)}`
      : `+${Math.round(m.value * 100)}% ${statLabel(m.stat)}`
    ).join(", ");
  }

  return { mods, label, name };
}

function statLabel(stat: string): string {
  const LABELS: Record<string, string> = {
    damage: "Bugei Damage", tapHit: "Hit (tap)", critChance: "Bugei Crit Chance", critMulti: "Bugei Crit Damage",
    hp: "HP", armor: "Armor", lifeOnHit: "Life on Hit",
    fireDmg: "Fire", lightningDmg: "Lightning", coldDmg: "Cold",
    goldFind: "Gold", xpGain: "XP",
    swordDmg: "Sword Dmg", axeDmg: "Axe Dmg", daggerDmg: "Dagger Dmg",
    wandDmg: "Wand Dmg", maceDmg: "Mace Dmg", bowDmg: "Bow Dmg", staffDmg: "Staff Dmg",
    arcaneCritChance: "Arcane Crit Chance", arcaneCritMulti: "Arcane Crit Damage",
    cooldownReduction: "CDR",
    blockChance: "Block", thorns: "Thorns",
  };
  return LABELS[stat] ?? stat;
}

// ── Main ──────────────────────────────────────────────────

function main(): void {
  const dataPath = path.resolve(__dirname, "skill-tree-data.ts");
  const content = fs.readFileSync(dataPath, "utf8");
  const lines = content.split("\n");

  const nodesLine = lines.find((l) => l.includes("TREE_NODES"))!;
  const nodesMatch = nodesLine.match(/= (\[.*)/);
  if (!nodesMatch) throw new Error("Could not find TREE_NODES");
  const nodes: RawNode[] = JSON.parse(nodesMatch[1].replace(/;$/, ""));

  const memLine = lines.find((l) => l.includes("TREE_FIGURE_MEMBERSHIP"))!;
  const memMatch = memLine.match(/= (\[.*)/);
  if (!memMatch) throw new Error("Could not find TREE_FIGURE_MEMBERSHIP");
  const mem: [number, number][] = JSON.parse(memMatch[1].replace(/;$/, ""));
  const figMap = new Map<number, number>(mem);

  // Class arc figure IDs (figures containing figureEntry nodes 419-422)
  const classArcFigIds = new Set([
    figMap.get(419), figMap.get(420), figMap.get(421), figMap.get(422),
  ].filter((x): x is number => x !== undefined));

  console.log("Class arc figure IDs:", [...classArcFigIds]);

  // Build gateway map: figure → figureEntry node
  const gatewayMap = new Map<number, RawNode>();
  nodes.filter((n) => n.type === "figureEntry").forEach((n) => {
    const fig = figMap.get(n.id);
    if (fig !== undefined) gatewayMap.set(fig, n);
  });

  // Determine theme per figure purely from class affinity + deterministic rotation
  // (no gateway-mod bias — gateway mods are generated FROM this theme, not vice versa)
  function figureTheme(figId: number, nodeClassAffinity?: string): Theme {
    const gw = gatewayMap.get(figId);
    const cls = nodeClassAffinity ?? gw?.classAffinity ?? "samurai";
    const themes = CLASS_THEME[cls] ?? ["damage"];
    return themes[figId % themes.length];
  }

  // Pre-compute progressive weapon amp values per notable node.
  // Notables in weapon figures get ascending amp (farther from entry → stronger).
  // Sorted by node ID within figure as proxy for distance from entry.
  const wpnAmpPerNode = new Map<number, number>();
  {
    // Group notables by figure
    const figNotables = new Map<number, number[]>();
    nodes.forEach((n) => {
      if (n.type !== "notable") return;
      const fig = figMap.get(n.id);
      if (fig === undefined) return;
      const theme = figureTheme(fig, n.classAffinity);
      if (!theme.startsWith("wpn_")) return;
      if (!figNotables.has(fig)) figNotables.set(fig, []);
      figNotables.get(fig)!.push(n.id);
    });
    // Assign progressive amp values
    for (const [, nodeIds] of figNotables) {
      nodeIds.sort((a, b) => a - b); // lower ID = closer to entry
      const tiers = WPN_AMP_TIERS[nodeIds.length] ?? WPN_AMP_TIERS[3]!;
      nodeIds.forEach((nid, i) => {
        wpnAmpPerNode.set(nid, tiers[Math.min(i, tiers.length - 1)]);
      });
    }
  }

  let populated = 0;
  let skipped = 0;

  nodes.forEach((node) => {
    // Only populate keystone/notable/figureEntry nodes
    if (node.type !== "keystone" && node.type !== "notable" && node.type !== "figureEntry") return;

    // Nodes in figures: always regenerate for proper balance hierarchy
    // Nodes outside figures: only populate if empty
    const figId = figMap.get(node.id);
    const inFigure = figId !== undefined;
    if (!inFigure && node.mods && node.mods.length > 0) { skipped++; return; }

    const isClassShape = inFigure && classArcFigIds.has(figId);
    const theme = figId !== undefined
      ? figureTheme(figId, node.classAffinity)
      : (CLASS_THEME[node.classAffinity ?? "samurai"] ?? ["damage"])[0];

    const rng = makeRng(node.id * 31337 + (figId ?? 0) * 137);
    const { mods, label, name } = buildMods(
      node.type as "notable" | "keystone" | "figureEntry",
      theme,
      isClassShape,
      rng,
      wpnAmpPerNode.get(node.id),
      node.id,
    );

    node.mods = mods;
    if (mods.length > 0) {
      node.stat = mods[0].stat;
      node.value = mods[0].value;
    }
    if (label) node.label = label;
    if (name) node.name = name;

    populated++;
  });

  console.log(`Populated ${populated} nodes, skipped ${skipped} with existing mods.`);

  // Re-serialize the data file
  // We need to keep all other content the same, just update TREE_NODES
  const serialized = JSON.stringify(nodes);
  const newNodesLine = nodesLine.replace(/= \[.*/, `= ${serialized};`);
  const updatedLines = lines.map((l) =>
    l.includes("TREE_NODES") ? newNodesLine : l,
  );

  // Update the generated timestamp comment
  const newContent = updatedLines.join("\n").replace(
    /Patched: .*/,
    `Patched: ${new Date().toISOString()}`,
  );

  fs.writeFileSync(dataPath, newContent, "utf8");
  console.log("Updated skill-tree-data.ts");

  // Summary
  const allNodes: RawNode[] = JSON.parse(serialized);
  const stillEmpty = allNodes.filter(
    (n) => n.mods && n.mods.length === 0 && n.type !== "start" && n.type !== "activeSkill",
  );
  console.log(`Still empty (non-activeSkill): ${stillEmpty.length}`);
}

main();
