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
  damage: 0.03, dps: 0.03, critChance: 0.05, critMulti: 0.08,
  hp: 0.10, fireDmg: 0.05, lightningDmg: 0.05, coldDmg: 0.05,
  goldFind: 0.05, xpGain: 0.06,
};

// Notable = power 2, Keystone = power 5
const POWER_MULT: Record<string, number> = { notable: 2, keystone: 5 };
// Class shape (figures containing nodes 419-422 gateways) = doubled
const CLASS_SHAPE_MULT = 2;

// ── Stat themes ───────────────────────────────────────────

type Theme = "damage" | "crit" | "tank" | "fire" | "lightning" | "cold" | "utility";

const THEME_STATS: Record<Theme, string[]> = {
  damage:    ["damage", "dps"],
  crit:      ["critChance", "critMulti"],
  tank:      ["hp", "damage"],                    // hp + some damage for variety
  fire:      ["fireDmg", "damage"],
  lightning: ["lightningDmg", "critChance"],       // lightning + crit (samurai)
  cold:      ["coldDmg", "critMulti"],             // cold + crit damage (archer)
  utility:   ["goldFind", "xpGain"],
};

const NOTABLE_NAMES: Partial<Record<Theme, string[]>> = {
  damage:    ["Razor Edge", "Blade Force", "Fury", "War Path"],
  crit:      ["Eagle Eye", "Sixth Sense", "Precision", "Sharp Wit"],
  tank:      ["Iron Skin", "Battle Hardened", "Fortify", "Endurance"],
  fire:      ["Pyre", "Inner Fire", "Ember Walk", "Flame Mastery"],
  lightning: ["Storm Conduit", "Thunder Step", "Spark", "Voltage"],
  cold:      ["Frostbite", "Chill Touch", "Ice Vein", "Permafrost"],
  utility:   ["Fortune Seeker", "Quick Learner", "Greed", "Scholar"],
};

const KEYSTONE_NAMES: Partial<Record<Theme, string[]>> = {
  damage:    ["World Destroyer", "Chaos Lord", "Berserker Rage", "Void Walker"],
  crit:      ["Perfect Aim", "Ghost Step", "Executioner", "Nightblade"],
  tank:      ["Iron Will", "Undying Will", "Oathkeeper", "Titan Grip"],
  fire:      ["Pyromancer", "Infernal Crown", "Sunfire", "Dragon Breath"],
  lightning: ["Thunder God", "Tempest Lord", "Voltage Surge", "Mjolnir"],
  cold:      ["Frost Emperor", "Blizzard Heart", "Avalanche", "Glacial Core"],
  utility:   ["Golden Age", "Eternal Student", "Midas Touch", "Grand Scholar"],
};

// ── Class primary themes ──────────────────────────────────

const CLASS_THEME: Record<string, Theme[]> = {
  samurai: ["damage", "crit", "lightning"],
  warrior: ["tank", "damage", "fire"],
  mage:    ["fire", "cold", "lightning"],
  archer:  ["crit", "cold", "damage"],
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

function buildMods(
  type: "notable" | "keystone",
  theme: Theme,
  isClassShape: boolean,
  rng: () => number,
): { mods: Mod[]; label: string; name: string | null } {
  const power = POWER_MULT[type] * (isClassShape ? CLASS_SHAPE_MULT : 1);
  const stats = THEME_STATS[theme];
  const names = (type === "keystone" ? KEYSTONE_NAMES[theme] : NOTABLE_NAMES[theme]) ?? ["Node"];

  // Pick stat(s): notable gets 1-2 stats, keystone gets 1-2 stats
  const statCount = type === "keystone" ? (rng() < 0.4 ? 2 : 1) : (rng() < 0.5 ? 2 : 1);

  const mods: Mod[] = [];
  const usedStats = new Set<string>();

  for (let i = 0; i < statCount && i < stats.length; i++) {
    const stat = stats[i];
    if (usedStats.has(stat)) continue;
    usedStats.add(stat);
    const base = BASE[stat] ?? 0.05;
    // Slight variance ±10%
    const variance = 1 + (rng() - 0.5) * 0.2;
    const value = Math.round(base * power * variance * 1000) / 1000;
    mods.push({ stat, value, mode: "percent" });
  }

  const name = names[Math.floor(rng() * names.length)];
  const labelParts = mods.map(m => `+${Math.round(m.value * 100)}% ${statLabel(m.stat)}`);
  const label = labelParts.join(", ");

  return { mods, label, name: type === "keystone" ? name : name };
}

function statLabel(stat: string): string {
  const LABELS: Record<string, string> = {
    damage: "Damage", dps: "DPS", critChance: "Crit", critMulti: "Crit Dmg",
    hp: "HP", fireDmg: "Fire", lightningDmg: "Lightning", coldDmg: "Cold",
    goldFind: "Gold", xpGain: "XP",
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

  // Determine theme per figure based on gateway mods + classAffinity
  function figureTheme(figId: number, nodeClassAffinity?: string): Theme {
    const gw = gatewayMap.get(figId);
    if (gw && gw.mods && gw.mods.length > 0) {
      // Derive from gateway mods
      const gwStats = gw.mods.map((m) => m.stat);
      if (gwStats.some((s) => s === "goldFind" || s === "xpGain")) return "utility";
      if (gwStats.some((s) => s === "fireDmg")) return "fire";
      if (gwStats.some((s) => s === "lightningDmg")) return "lightning";
      if (gwStats.some((s) => s === "coldDmg")) return "cold";
      if (gwStats.some((s) => s === "critChance" || s === "critMulti")) return "crit";
      if (gwStats.some((s) => s === "hp")) return "tank";
      return "damage";
    }
    // Fallback: use class affinity
    const cls = nodeClassAffinity ?? gw?.classAffinity ?? "samurai";
    const themes = CLASS_THEME[cls] ?? ["damage"];
    // Pick rotating theme by figId
    return themes[figId % themes.length];
  }

  let populated = 0;
  let skipped = 0;

  nodes.forEach((node) => {
    // Only populate empty keystone/notable nodes
    if (!node.mods || node.mods.length > 0) { skipped++; return; }
    if (node.type !== "keystone" && node.type !== "notable") return;

    const figId = figMap.get(node.id);
    const isClassShape = figId !== undefined && classArcFigIds.has(figId);
    const theme = figId !== undefined
      ? figureTheme(figId, node.classAffinity)
      : (CLASS_THEME[node.classAffinity ?? "samurai"] ?? ["damage"])[0];

    const rng = makeRng(node.id * 31337 + (figId ?? 0) * 137);
    const { mods, label, name } = buildMods(
      node.type as "notable" | "keystone",
      theme,
      isClassShape,
      rng,
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
    (n) => n.mods && n.mods.length === 0 && n.type !== "start" && n.type !== "figureEntry" && n.type !== "activeSkill",
  );
  console.log(`Still empty (non-activeSkill): ${stillEmpty.length}`);
}

main();
