/**
 * Fix theme violations in skill-tree-data.ts.
 *
 * Violation rule: no figure may contain both critChance AND magic damage
 * (fireDmg / coldDmg / lightningDmg) simultaneously.
 *
 * Strategy:
 *  1. For each violating figure, count nodes that contribute critChance vs
 *     those that contribute magic damage (a node with BOTH counts for both).
 *  2. Majority wins. ALL nodes contributing to the minority side get their
 *     mods completely replaced to match the majority theme.
 *  3. Nodes with BOTH critChance AND magic damage are always in the minority
 *     and always get fixed.
 *
 * Usage:  npx tsx shared/fix-tree-violations.ts
 */

/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";

interface Mod { stat: string; value: number; mode: string; }
interface RawNode {
  id: number; nodeId: string; type: string; classAffinity?: string;
  x: number; y: number; label?: string; name?: string | null;
  stat?: string | null; value?: number; defId?: string | null;
  activeSkillId?: string | null; mods?: Mod[]; connections: number[];
  connector?: boolean;
}

// ── Base values per stat (power-1 baseline) ────────────────
const BASE: Record<string, number> = {
  damage: 0.03, dps: 0.03, critChance: 0.05, critMulti: 0.08,
  hp: 0.10, fireDmg: 0.05, lightningDmg: 0.05, coldDmg: 0.05,
  goldFind: 0.05, xpGain: 0.06,
};

// ── Theme definitions (violation-safe) ────────────────────
type Theme = "damage" | "crit" | "tank" | "fire" | "lightning" | "cold" | "utility";

const THEME_STATS: Record<Theme, string[]> = {
  damage:    ["damage", "dps"],
  crit:      ["critChance", "critMulti"],
  tank:      ["hp", "damage"],
  fire:      ["fireDmg", "damage"],       // no critChance
  lightning: ["lightningDmg", "damage"],  // no critChance
  cold:      ["coldDmg", "critMulti"],    // critMulti OK, not critChance
  utility:   ["goldFind", "xpGain"],
};

const STAT_LABEL: Record<string, string> = {
  damage: "Bugei Damage", dps: "DPS", critChance: "Bugei Crit Chance", critMulti: "Bugei Crit Damage",
  hp: "HP", fireDmg: "Fire", lightningDmg: "Lightning", coldDmg: "Cold",
  goldFind: "Gold", xpGain: "XP",
};

const MAGIC_DAMAGE = new Set(["fireDmg", "coldDmg", "lightningDmg"]);

function isViolation(stats: Set<string>): boolean {
  return stats.has("critChance") && [...stats].some(s => MAGIC_DAMAGE.has(s));
}

function dominantMagicStat(stats: Set<string>): string {
  return [...stats].find(s => MAGIC_DAMAGE.has(s)) ?? "fireDmg";
}

function magicStatToTheme(stat: string): Theme {
  if (stat === "fireDmg")      return "fire";
  if (stat === "lightningDmg") return "lightning";
  if (stat === "coldDmg")      return "cold";
  return "damage";
}

// ── Seeded RNG ─────────────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed | 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Completely replace a node's mods to match target theme ─
function rebuildMods(node: RawNode, targetTheme: Theme, rng: () => number): void {
  const oldMods = node.mods ?? [];
  // Estimate total power from existing mods (sum of value/base for each stat)
  let totalPower = 0;
  for (const m of oldMods) {
    const base = BASE[m.stat] ?? 0.05;
    if (base > 0) totalPower += m.value / base;
  }
  if (totalPower <= 0) {
    totalPower = node.type === "keystone" ? 5 : 2;
  }

  const stats = THEME_STATS[targetTheme];
  const count = Math.min(Math.max(oldMods.length, 1), stats.length);
  const powerPerStat = totalPower / count;

  const newMods: Mod[] = [];
  for (let i = 0; i < count; i++) {
    const stat = stats[i];
    const base = BASE[stat] ?? 0.05;
    const variance = 1 + (rng() - 0.5) * 0.15;
    const value = Math.round(base * powerPerStat * variance * 1000) / 1000;
    newMods.push({ stat, value, mode: "percent" });
  }

  node.mods = newMods;
  if (newMods.length > 0) {
    node.stat = newMods[0].stat;
    node.value = newMods[0].value;
  }
  const labelParts = newMods.map(m => `+${Math.round(m.value * 100)}% ${STAT_LABEL[m.stat] ?? m.stat}`);
  node.label = labelParts.join(", ");
}

function isModifiable(node: RawNode): boolean {
  // Allow figureEntry - they can cause violations when their mods mismatch the figure
  return node.type !== "start" && node.type !== "activeSkill" && node.type !== "classSkill";
}

// ── Main ───────────────────────────────────────────────────
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

  // Build figure → node list
  const figNodes = new Map<number, RawNode[]>();
  for (const node of nodes) {
    const fig = figMap.get(node.id);
    if (fig === undefined) continue;
    if (!figNodes.has(fig)) figNodes.set(fig, []);
    figNodes.get(fig)!.push(node);
  }

  let violationCount = 0;
  let fixedNodes = 0;

  for (const [figId, figNodeList] of figNodes) {
    // Collect all stats in figure
    const allStatSet = new Set<string>();
    for (const node of figNodeList) {
      for (const m of (node.mods ?? [])) allStatSet.add(m.stat);
    }

    if (!isViolation(allStatSet)) continue;
    violationCount++;

    // Determine the magic element present
    const magicStat = dominantMagicStat(allStatSet);
    const magicTheme = magicStatToTheme(magicStat);

    // Categorise modifiable nodes
    // A node "contributes crit" if any mod is critChance
    // A node "contributes magic" if any mod is fireDmg/coldDmg/lightningDmg
    const critContrib: RawNode[] = [];
    const magicContrib: RawNode[] = [];
    const mixedContrib: RawNode[] = [];  // has BOTH

    for (const node of figNodeList) {
      if (!isModifiable(node)) continue;
      if (!node.mods || node.mods.length === 0) continue;
      const nodeStats = new Set(node.mods.map(m => m.stat));
      const hasCrit  = nodeStats.has("critChance");
      const hasMagic = [...nodeStats].some(s => MAGIC_DAMAGE.has(s));
      if (hasCrit && hasMagic)  mixedContrib.push(node);
      else if (hasCrit)         critContrib.push(node);
      else if (hasMagic)        magicContrib.push(node);
    }

    // Mixed nodes always need to be fixed (they alone cause violations)
    // For pure groups, majority wins
    const pureMajorityIsMagic = magicContrib.length >= critContrib.length;
    const majorityTheme: Theme = pureMajorityIsMagic ? magicTheme : "crit";
    const nodesToFix: RawNode[] = [
      ...mixedContrib,                                         // always fix
      ...(pureMajorityIsMagic ? critContrib : magicContrib),  // minority
    ];

    console.log(
      `Figure ${figId} [${magicTheme}]: ` +
      `pure-magic=${magicContrib.length}, pure-crit=${critContrib.length}, ` +
      `mixed=${mixedContrib.length} → majority="${majorityTheme}", fixing ${nodesToFix.length} nodes`
    );

    for (const node of nodesToFix) {
      const rng = makeRng(node.id * 99991 + figId * 7919);
      rebuildMods(node, majorityTheme, rng);
      fixedNodes++;
    }

    // Verify this figure is now clean
    const postStats = new Set<string>();
    for (const node of figNodeList) {
      for (const m of (node.mods ?? [])) postStats.add(m.stat);
    }
    if (isViolation(postStats)) {
      console.error(`  !! Figure ${figId} STILL violates after fixing!`);
    }
  }

  console.log(`\nFound ${violationCount} violations. Fixed ${fixedNodes} nodes total.`);

  // Final scan
  let remaining = 0;
  for (const [figId, figNodeList] of figNodes) {
    const stats = new Set<string>();
    for (const node of figNodeList) for (const m of (node.mods ?? [])) stats.add(m.stat);
    if (isViolation(stats)) { console.warn(`Still violating: figure ${figId}`); remaining++; }
  }
  if (remaining === 0) console.log("All violations fixed!");
  else console.error(`${remaining} violations remain!`);

  // Write back
  const serialized = JSON.stringify(nodes);
  const newNodesLine = nodesLine.replace(/= \[.*/, `= ${serialized};`);
  const updatedLines = lines.map((l) =>
    l.includes("TREE_NODES") && l === nodesLine ? newNodesLine : l,
  );
  fs.writeFileSync(dataPath, updatedLines.join("\n"), "utf8");
  console.log("Wrote updated skill-tree-data.ts");
}

main();
