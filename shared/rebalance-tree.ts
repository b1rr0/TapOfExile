/**
 * Comprehensive skill tree rebalance script.
 *
 * 1. Swap gateways 419 ↔ 420 + retheme figures 40, 41
 * 2. Node 421 → elemental mage + retheme figure 42
 * 3. Node 422 → damage/crit + retheme figure 43
 * 4. Remove ALL goldFind/xpGain from every node
 * 5. Cap HP mods at 15% per node
 * 6. Assign unique mechanics to notables outside figures
 *
 * Usage:  npx tsx shared/rebalance-tree.ts
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

// ── Helpers ─────────────────────────────────────────────────

const STAT_LABEL: Record<string, string> = {
  damage: "Damage", dps: "DPS", critChance: "Crit Chance", critMulti: "Crit Dmg",
  hp: "HP", fireDmg: "Fire", lightningDmg: "Lightning", coldDmg: "Cold",
  goldFind: "Gold", xpGain: "XP", dodge: "Dodge",
  // Unique mechanics
  thorns: "Thorns", lifeSteal: "Life Steal", multiStrike: "Multi-Strike",
  luckyHits: "Lucky Hits", execute: "Execute", armorDouble: "Armor ×2",
  shieldBash: "Shield Bash", firstStrike: "First Strike", critHeal: "Crit Heal",
  regenBoost: "Regen Boost", fireFromLightning: "Fire=Lightning",
  coldFromFire: "Cold=Fire", lightningFromCold: "Lightning=Cold",
  allElemental: "Elemental Mastery", penetration: "Penetration",
  bossSlayer: "Boss Slayer", secondWind: "Second Wind", overkill: "Overkill",
  critExplosion: "Crit Explosion", dodgeCounter: "Dodge Counter",
};

const BASE: Record<string, number> = {
  damage: 0.03, dps: 0.03, critChance: 0.05, critMulti: 0.08,
  hp: 0.10, fireDmg: 0.05, lightningDmg: 0.05, coldDmg: 0.05,
};

type Theme = "damage" | "crit" | "tank" | "fire" | "lightning" | "cold" | "elemental";
const THEME_STATS: Record<Theme, string[]> = {
  damage:    ["damage", "dps"],
  crit:      ["critChance", "critMulti"],
  tank:      ["hp", "damage"],
  fire:      ["fireDmg", "damage"],
  lightning: ["lightningDmg", "damage"],
  cold:      ["coldDmg", "critMulti"],
  elemental: ["fireDmg", "coldDmg", "lightningDmg"],
};

function makeRng(seed: number): () => number {
  let s = seed | 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function rebuildLabel(mods: Mod[]): string {
  return mods.map(m => {
    const pct = Math.round(m.value * 100);
    const label = STAT_LABEL[m.stat] ?? m.stat;
    if (m.mode === "flat") return `+${m.value} ${label}`;
    return `+${pct}% ${label}`;
  }).join(", ");
}

function rethemeNode(node: RawNode, theme: Theme, power: number, rng: () => number): void {
  const stats = THEME_STATS[theme];
  const count = Math.min(2, stats.length);
  const mods: Mod[] = [];
  for (let i = 0; i < count; i++) {
    const stat = stats[i % stats.length];
    const base = BASE[stat] ?? 0.05;
    const variance = 1 + (rng() - 0.5) * 0.15;
    mods.push({ stat, value: Math.round(base * power * variance * 1000) / 1000, mode: "percent" });
  }
  node.mods = mods;
  node.stat = mods[0]?.stat || null;
  node.value = mods[0]?.value || 0;
  node.label = rebuildLabel(mods);
}

// ── Unique mechanics for notables outside figures ───────────

interface UniqueMechanic {
  stat: string;
  value: number;
  mode: string;
  name: string;
  description: string;
  classAffinity?: string[];  // which classes this is near
}

const UNIQUE_MECHANICS: UniqueMechanic[] = [
  // Samurai-themed
  { stat: "multiStrike", value: 0.15, mode: "flat", name: "Twin Slash", description: "15% chance to strike twice", classAffinity: ["samurai"] },
  { stat: "firstStrike", value: 2.0, mode: "flat", name: "Ambush Master", description: "First hit per monster deals 3× damage", classAffinity: ["samurai"] },
  { stat: "critExplosion", value: 0.25, mode: "flat", name: "Lethal Precision", description: "Crits deal 25% as burst damage", classAffinity: ["samurai"] },
  { stat: "execute", value: 0.30, mode: "flat", name: "Finishing Blow", description: "+30% damage to enemies below 30% HP", classAffinity: ["samurai"] },
  { stat: "multiStrike", value: 0.10, mode: "flat", name: "Flurry", description: "10% chance to strike twice", classAffinity: ["samurai"] },

  // Warrior-themed
  { stat: "thorns", value: 0.20, mode: "flat", name: "Thorns Aura", description: "Reflect 20% of damage taken", classAffinity: ["warrior"] },
  { stat: "armorDouble", value: 1.0, mode: "flat", name: "Iron Fortress", description: "Armor effectiveness ×2", classAffinity: ["warrior"] },
  { stat: "shieldBash", value: 0.30, mode: "flat", name: "Shield Bash", description: "Blocking deals 30% damage back", classAffinity: ["warrior"] },
  { stat: "secondWind", value: 0.15, mode: "flat", name: "Last Stand", description: "15% chance to survive lethal hit at 1 HP", classAffinity: ["warrior"] },
  { stat: "thorns", value: 0.15, mode: "flat", name: "Barbed Skin", description: "Reflect 15% of damage taken", classAffinity: ["warrior"] },

  // Mage-themed
  { stat: "fireFromLightning", value: 1.0, mode: "flat", name: "Storm Flame", description: "Fire bonus equals Lightning bonus", classAffinity: ["mage"] },
  { stat: "coldFromFire", value: 1.0, mode: "flat", name: "Frozen Pyre", description: "Cold bonus equals Fire bonus", classAffinity: ["mage"] },
  { stat: "lightningFromCold", value: 1.0, mode: "flat", name: "Glacial Shock", description: "Lightning bonus equals Cold bonus", classAffinity: ["mage"] },
  { stat: "allElemental", value: 1.0, mode: "flat", name: "Elemental Mastery", description: "All elements equal highest bonus", classAffinity: ["mage"] },
  { stat: "penetration", value: 0.20, mode: "flat", name: "Arcane Pierce", description: "Ignore 20% enemy resistance", classAffinity: ["mage"] },

  // Archer-themed
  { stat: "luckyHits", value: 1.0, mode: "flat", name: "Fortune's Favor", description: "Crit rolled twice, take better", classAffinity: ["archer"] },
  { stat: "dodgeCounter", value: 0.50, mode: "flat", name: "Riposte", description: "On dodge, deal 50% damage back", classAffinity: ["archer"] },
  { stat: "overkill", value: 1.0, mode: "flat", name: "Through and Through", description: "Excess kill damage hits next enemy", classAffinity: ["archer"] },
  { stat: "bossSlayer", value: 0.25, mode: "flat", name: "Giant Killer", description: "+25% damage to boss monsters", classAffinity: ["archer"] },
  { stat: "luckyHits", value: 1.0, mode: "flat", name: "Keen Eye", description: "Crit rolled twice, take better", classAffinity: ["archer"] },

  // Neutral / any class
  { stat: "lifeSteal", value: 0.05, mode: "flat", name: "Vampiric Strikes", description: "Heal 5% of damage dealt" },
  { stat: "critHeal", value: 15, mode: "flat", name: "Battle Meditation", description: "Heal 15 HP on every critical hit" },
  { stat: "regenBoost", value: 2.0, mode: "flat", name: "Vital Surge", description: "Life regen effectiveness ×2" },
  { stat: "lifeSteal", value: 0.03, mode: "flat", name: "Blood Drinker", description: "Heal 3% of damage dealt" },
  { stat: "penetration", value: 0.15, mode: "flat", name: "Spell Pierce", description: "Ignore 15% enemy resistance" },
  { stat: "bossSlayer", value: 0.20, mode: "flat", name: "Titan Feller", description: "+20% damage to bosses" },
  { stat: "execute", value: 0.20, mode: "flat", name: "Coup de Grace", description: "+20% damage to low HP enemies" },
  { stat: "critHeal", value: 10, mode: "flat", name: "Life Tap", description: "Heal 10 HP on every critical hit" },
  { stat: "regenBoost", value: 1.5, mode: "flat", name: "Regenerator", description: "Life regen ×1.5" },
  { stat: "secondWind", value: 0.10, mode: "flat", name: "Undying", description: "10% chance to survive lethal at 1 HP" },
];

// ── Main ────────────────────────────────────────────────────

function main(): void {
  const dataPath = path.resolve(__dirname, "skill-tree-data.ts");
  const content = fs.readFileSync(dataPath, "utf8");
  const lines = content.split("\n");

  const nodesLine = lines.find(l => l.includes("TREE_NODES"))!;
  const nodesMatch = nodesLine.match(/= (\[.*)/);
  if (!nodesMatch) throw new Error("Could not find TREE_NODES");
  const nodes: RawNode[] = JSON.parse(nodesMatch[1].replace(/;$/, ""));

  const memLine = lines.find(l => l.includes("TREE_FIGURE_MEMBERSHIP"))!;
  const memMatch = memLine.match(/= (\[.*)/);
  if (!memMatch) throw new Error("Could not find TREE_FIGURE_MEMBERSHIP");
  const mem: [number, number][] = JSON.parse(memMatch[1].replace(/;$/, ""));
  const figMap = new Map<number, number>(mem);

  // Build figure → nodes lookup
  const figNodes = new Map<number, RawNode[]>();
  for (const node of nodes) {
    const fig = figMap.get(node.id);
    if (fig === undefined) continue;
    if (!figNodes.has(fig)) figNodes.set(fig, []);
    figNodes.get(fig)!.push(node);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Swap 419 ↔ 420
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 1: Swap 419 ↔ 420 ===");
  const n419 = nodes[419], n420 = nodes[420];
  // Save old mods
  const old419Mods = JSON.parse(JSON.stringify(n419.mods));
  const old419Name = n419.name;
  const old419Label = n419.label;
  const old420Mods = JSON.parse(JSON.stringify(n420.mods));
  const old420Name = n420.name;
  const old420Label = n420.label;
  // Swap
  n419.mods = old420Mods; n419.name = old420Name; n419.label = old420Label;
  n419.stat = n419.mods![0]?.stat; n419.value = n419.mods![0]?.value;
  n420.mods = old419Mods; n420.name = old419Name; n420.label = old419Label;
  n420.stat = n420.mods![0]?.stat; n420.value = n420.mods![0]?.value;
  console.log(`  419 now: ${rebuildLabel(n419.mods!)}`);
  console.log(`  420 now: ${rebuildLabel(n420.mods!)}`);

  // Retheme figure 40 → crit (matching new 419=crit gateway)
  const fig40 = figNodes.get(40) || [];
  for (const node of fig40) {
    if (node.id === 419) continue; // skip gateway
    if (node.type === "start" || node.type === "activeSkill") continue;
    const power = node.type === "keystone" ? 8 : 4; // class shape = doubled
    rethemeNode(node, "crit", power, makeRng(node.id * 7777 + 40));
  }
  console.log(`  Rethemed ${fig40.length - 1} nodes in figure 40 → crit`);

  // Retheme figure 41 → tank (matching new 420=damage/hp gateway)
  const fig41 = figNodes.get(41) || [];
  for (const node of fig41) {
    if (node.id === 420) continue;
    if (node.type === "start" || node.type === "activeSkill") continue;
    const power = node.type === "keystone" ? 8 : 4;
    rethemeNode(node, "tank", power, makeRng(node.id * 7777 + 41));
  }
  console.log(`  Rethemed ${fig41.length - 1} nodes in figure 41 → tank`);

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Node 421 → elemental mage
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 2: Node 421 → elemental ===");
  const n421 = nodes[421];
  n421.mods = [
    { stat: "fireDmg", value: 0.10, mode: "percent" },
    { stat: "lightningDmg", value: 0.08, mode: "percent" },
  ];
  n421.stat = "fireDmg"; n421.value = 0.10;
  n421.name = "Elemental Gateway";
  n421.label = rebuildLabel(n421.mods);
  console.log(`  421: ${n421.label}`);

  // Retheme figure 42 → elemental mix
  const elementalThemes: Theme[] = ["fire", "cold", "lightning"];
  const fig42 = figNodes.get(42) || [];
  let themeIdx = 0;
  for (const node of fig42) {
    if (node.id === 421) continue;
    if (node.type === "start" || node.type === "activeSkill") continue;
    const power = node.type === "keystone" ? 8 : 4;
    rethemeNode(node, elementalThemes[themeIdx % elementalThemes.length], power, makeRng(node.id * 7777 + 42));
    themeIdx++;
  }
  console.log(`  Rethemed ${fig42.length - 1} nodes in figure 42 → elemental mix`);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Node 422 → damage/crit (remove gold)
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 3: Node 422 → damage/crit ===");
  const n422 = nodes[422];
  n422.mods = [
    { stat: "damage", value: 0.12, mode: "percent" },
    { stat: "critMulti", value: 0.10, mode: "percent" },
  ];
  n422.stat = "damage"; n422.value = 0.12;
  n422.name = "Devastation";
  n422.label = rebuildLabel(n422.mods);
  console.log(`  422: ${n422.label}`);

  // Retheme figure 43 → damage theme
  const fig43 = figNodes.get(43) || [];
  for (const node of fig43) {
    if (node.id === 422) continue;
    if (node.type === "start" || node.type === "activeSkill") continue;
    const power = node.type === "keystone" ? 8 : 4;
    rethemeNode(node, "damage", power, makeRng(node.id * 7777 + 43));
  }
  console.log(`  Rethemed ${fig43.length - 1} nodes in figure 43 → damage`);

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Remove ALL goldFind/xpGain from tree
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 4: Remove ALL goldFind/xpGain ===");
  let goldRemoved = 0;
  const GOLD_STATS = new Set(["goldFind", "xpGain"]);
  for (const node of nodes) {
    if (!node.mods || node.mods.length === 0) continue;
    const hasGold = node.mods.some(m => GOLD_STATS.has(m.stat));
    if (!hasGold) continue;

    // Replace gold mods with figure-appropriate theme
    const fig = figMap.get(node.id);
    let theme: Theme = "damage";
    if (node.classAffinity === "warrior") theme = "tank";
    else if (node.classAffinity === "mage") theme = "fire";
    else if (node.classAffinity === "archer") theme = "crit";

    // Estimate power from existing mods
    let totalPower = 0;
    for (const m of node.mods) {
      const base = (BASE[m.stat] ?? 0.05);
      if (base > 0) totalPower += m.value / base;
    }
    if (totalPower <= 0) totalPower = node.type === "keystone" ? 5 : 2;

    const rng = makeRng(node.id * 54321 + (fig ?? 0));
    const stats = THEME_STATS[theme];
    const count = Math.min(node.mods.length, stats.length);
    const powerPer = totalPower / count;

    const newMods: Mod[] = [];
    for (let i = 0; i < count; i++) {
      const stat = stats[i];
      const base = BASE[stat] ?? 0.05;
      const variance = 1 + (rng() - 0.5) * 0.15;
      newMods.push({ stat, value: Math.round(base * powerPer * variance * 1000) / 1000, mode: "percent" });
    }
    node.mods = newMods;
    node.stat = newMods[0]?.stat || null;
    node.value = newMods[0]?.value || 0;
    node.label = rebuildLabel(newMods);
    // Keep name or update
    if (node.name && (node.name.includes("Gold") || node.name.includes("Midas") ||
        node.name.includes("Fortune") || node.name.includes("Scholar") ||
        node.name.includes("Greed") || node.name.includes("Student") ||
        node.name.includes("Sage") || node.name.includes("Alchemist") ||
        node.name.includes("Plunder") || node.name.includes("Quick Learner"))) {
      // Assign new thematic name
      const NAMES: Record<Theme, string[]> = {
        damage: ["Blade Storm", "Fury", "Havoc", "Decimation"],
        crit: ["Eagle Eye", "Assassin's Mark", "Deadly Aim", "Sniper"],
        tank: ["Bulwark", "Stone Skin", "Resilience", "Guardian"],
        fire: ["Pyroclasm", "Ember Heart", "Inferno", "Flame Burst"],
        lightning: ["Thunder Strike", "Arc Flash", "Tempest", "Shock"],
        cold: ["Glacial Force", "Winter's Bite", "Frost Nova", "Ice Shard"],
        elemental: ["Primal Force", "Elemental Surge", "Chaos Rift", "Arcane Blast"],
      };
      node.name = NAMES[theme][Math.floor(rng() * NAMES[theme].length)];
    }
    goldRemoved++;
  }
  console.log(`  Removed gold/xp from ${goldRemoved} nodes`);

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Cap HP at 15% per node
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 5: Cap HP at 15% ===");
  let hpCapped = 0;
  for (const node of nodes) {
    if (!node.mods) continue;
    let changed = false;
    for (const m of node.mods) {
      if (m.stat === "hp" && m.mode === "percent" && m.value > 0.15) {
        m.value = 0.15;
        changed = true;
      }
    }
    if (changed) {
      node.label = rebuildLabel(node.mods);
      if (node.stat === "hp") node.value = 0.15;
      hpCapped++;
    }
  }
  console.log(`  Capped HP on ${hpCapped} nodes to 15%`);

  // ═══════════════════════════════════════════════════════════
  // STEP 6: Assign unique mechanics to notables outside figures
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== STEP 6: Unique mechanic notables ===");
  const inFigure = new Set(mem.map(([nid]) => nid));
  const orphanNotables = nodes.filter(n =>
    n.type === "notable" && !inFigure.has(n.id)
  );
  console.log(`  Found ${orphanNotables.length} notable nodes outside figures`);

  // Sort by proximity to class areas (use classAffinity, then position)
  // Assign unique mechanics based on class affinity
  let mechIdx = 0;
  const assignedByClass: Record<string, number> = {};

  for (const node of orphanNotables) {
    const cls = node.classAffinity || "neutral";

    // Find best matching mechanic for this class
    let bestMech: UniqueMechanic | null = null;
    for (let attempt = 0; attempt < UNIQUE_MECHANICS.length; attempt++) {
      const idx = (mechIdx + attempt) % UNIQUE_MECHANICS.length;
      const mech = UNIQUE_MECHANICS[idx];
      if (!mech.classAffinity || mech.classAffinity.includes(cls)) {
        bestMech = mech;
        mechIdx = idx + 1;
        break;
      }
    }
    if (!bestMech) {
      bestMech = UNIQUE_MECHANICS[mechIdx % UNIQUE_MECHANICS.length];
      mechIdx++;
    }

    node.mods = [{ stat: bestMech.stat, value: bestMech.value, mode: bestMech.mode }];
    node.stat = bestMech.stat;
    node.value = bestMech.value;
    node.name = bestMech.name;
    node.label = bestMech.description;

    assignedByClass[cls] = (assignedByClass[cls] || 0) + 1;
  }

  console.log(`  Assigned unique mechanics:`, assignedByClass);

  // ═══════════════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════════════
  console.log("\n=== VERIFICATION ===");
  const goldNodes = nodes.filter(n => n.mods?.some(m => m.stat === "goldFind" || m.stat === "xpGain"));
  console.log(`  Nodes with gold/xp: ${goldNodes.length}`);
  const highHp = nodes.filter(n => n.mods?.some(m => m.stat === "hp" && m.mode === "percent" && m.value > 0.15));
  console.log(`  Nodes with HP > 15%: ${highHp.length}`);
  console.log(`  Node 419 mods: ${JSON.stringify(nodes[419].mods?.map(m => m.stat))}`);
  console.log(`  Node 420 mods: ${JSON.stringify(nodes[420].mods?.map(m => m.stat))}`);
  console.log(`  Node 421 mods: ${JSON.stringify(nodes[421].mods?.map(m => m.stat))}`);
  console.log(`  Node 422 mods: ${JSON.stringify(nodes[422].mods?.map(m => m.stat))}`);

  const uniqueNotables = nodes.filter(n =>
    n.type === "notable" && !inFigure.has(n.id) &&
    n.mods?.some(m => !["damage","dps","critChance","critMulti","hp","fireDmg","lightningDmg","coldDmg","dodge"].includes(m.stat))
  );
  console.log(`  Unique mechanic notables: ${uniqueNotables.length}`);

  // ═══════════════════════════════════════════════════════════
  // WRITE BACK
  // ═══════════════════════════════════════════════════════════
  const serialized = JSON.stringify(nodes);
  const newNodesLine = nodesLine.replace(/= \[.*/, `= ${serialized};`);
  const updatedLines = lines.map(l => l === nodesLine ? newNodesLine : l);
  fs.writeFileSync(dataPath, updatedLines.join("\n"), "utf8");
  console.log("\nWrote updated skill-tree-data.ts");
}

main();
