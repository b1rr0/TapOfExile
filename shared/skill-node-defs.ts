/**
 * Skill Node Definitions — OOP data model for skill tree stat bonuses.
 *
 * Each node in the passive tree carries a NodeDef that describes its stat effects.
 * NodeDef holds one or more StatModifiers, enabling proper multi-stat support.
 *
 * Usage:
 *   const bonuses = computeAllocatedBonuses(tree.nodes, allocatedSet);
 *   // bonuses.percent = { tapDamage: 0.23, critChance: 0.15, ... }
 *   // Apply:  finalStat = baseStat * (1 + bonuses.percent[key])
 */

import type { ModMode } from "./types";

// ── StatModifier ──────────────────────────────────────────

/**
 * A single stat bonus. Immutable value object.
 *
 * @example
 *   new StatModifier("damage", 0.08, "percent")  // +8% Damage
 *   new StatModifier("hp", 50, "flat")            // +50 flat HP
 */
export class StatModifier {
  readonly stat: string;
  readonly value: number;
  readonly mode: ModMode;

  constructor(stat: string, value: number, mode: ModMode = "percent") {
    this.stat = stat;
    this.value = value;
    this.mode = mode;
    Object.freeze(this);
  }
}

// ── NodeDef ───────────────────────────────────────────────

/**
 * Static definition of a skill node's effects.
 * Passed as `data` to SkillNode constructor.
 *
 * Backward-compatible: exposes .label, .name, .stat, .value
 * for scene tooltip code that reads these fields.
 */
export class NodeDef {
  readonly id: string;
  readonly label: string;
  readonly name: string | null;
  readonly type: string;
  readonly mods: StatModifier[];
  readonly stat: string | null;
  readonly value: number;

  constructor(id: string, label: string, name: string | null, type: string, ...mods: StatModifier[]) {
    this.id = id;
    this.label = label;
    this.name = name;
    this.type = type;
    this.mods = mods;

    // Backward compat — first modifier as .stat / .value
    this.stat = mods.length > 0 ? mods[0].stat : null;
    this.value = mods.length > 0 ? mods[0].value : 0;

    Object.freeze(this);
  }
}

// ── Factory helpers ───────────────────────────────────────

export function pct(stat: string, value: number): StatModifier {
  return new StatModifier(stat, value, "percent");
}

export function flat(stat: string, value: number): StatModifier {
  return new StatModifier(stat, value, "flat");
}

export function minor(id: string, label: string, ...mods: StatModifier[]): NodeDef {
  return new NodeDef(id, label, null, "minor", ...mods);
}

export function notable(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef {
  return new NodeDef(id, label, name, "notable", ...mods);
}

export function keystone(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef {
  return new NodeDef(id, label, name, "keystone", ...mods);
}

export function classSkill(id: string, label: string, name: string, ...mods: StatModifier[]): NodeDef {
  return new NodeDef(id, label, name, "classSkill", ...mods);
}

// ── Stat key → player property mapping ────────────────────

export const STAT_TO_PLAYER: Record<string, string> = {
  damage:      "tapDamage",
  dps:         "tapDamage",   // legacy — DPS nodes now boost tap damage
  critChance:  "critChance",
  critMulti:   "critMultiplier",
  hp:          "hp",
  goldFind:    "goldFind",
  xpGain:      "xpGain",
  dodge:       "dodgeChance",
  fireDmg:     "fireDmg",
  lightningDmg:"lightningDmg",
  coldDmg:     "coldDmg",
  pureDmg:     "pureDmg",
};

// ── Minor pool (16) ──────────────────────────────────────

export const MINOR_POOL: NodeDef[] = [
  minor("min_dmg_3",    "+3% Damage",          pct("damage", 0.03)),
  minor("min_crit_5",   "+5% Crit Chance",     pct("critChance", 0.05)),
  minor("min_critd_8",  "+8% Crit Damage",     pct("critMulti", 0.08)),
  minor("min_fire_5",   "+5% Fire Damage",     pct("fireDmg", 0.05)),
  minor("min_hp_10",    "+10% HP",             pct("hp", 0.10)),
  minor("min_gold_5",   "+5% Gold Find",       pct("goldFind", 0.05)),
  minor("min_xp_6",     "+6% XP Gain",         pct("xpGain", 0.06)),
  minor("min_dps_3",    "+3% DPS",             pct("dps", 0.03)),
  minor("min_dmg_4",    "+4% Damage",          pct("damage", 0.04)),
  minor("min_crit_3",   "+3% Crit Chance",     pct("critChance", 0.03)),
  minor("min_critd_6",  "+6% Crit Damage",     pct("critMulti", 0.06)),
  minor("min_ltn_5",    "+5% Lightning Damage",pct("lightningDmg", 0.05)),
  minor("min_hp_8",     "+8% HP",              pct("hp", 0.08)),
  minor("min_gold_4",   "+4% Gold Find",       pct("goldFind", 0.04)),
  minor("min_cold_5",   "+5% Cold Damage",     pct("coldDmg", 0.05)),
  minor("min_dps_4",    "+4% DPS",             pct("dps", 0.04)),
];

// ── Notable pool (24) ────────────────────────────────────

export const NOTABLE_POOL: NodeDef[] = [
  notable("not_razor",      "+12% Damage",              "Razor Edge",       pct("damage", 0.12)),
  notable("not_eagle",      "+15% Crit Chance",         "Eagle Eye",        pct("critChance", 0.15)),
  notable("not_brutal",     "+20% Crit Damage",         "Brutal Force",     pct("critMulti", 0.20)),
  notable("not_pyre",       "+15% Fire Damage",         "Pyre",             pct("fireDmg", 0.15)),
  notable("not_iron",       "+25% HP",                  "Iron Skin",        pct("hp", 0.25)),
  notable("not_fortune",    "+15% Gold Find",           "Fortune Seeker",   pct("goldFind", 0.15)),
  notable("not_learner",    "+18% XP Gain",             "Quick Learner",    pct("xpGain", 0.18)),
  notable("not_relentless", "+10% DPS",                 "Relentless",       pct("dps", 0.10)),

  notable("not_blood",      "+8% Dmg, +15% HP",         "Blood Frenzy",    pct("damage", 0.08),  pct("hp", 0.15)),
  notable("not_precision",  "+10% Crit, +10% Dmg",      "Precision",       pct("critChance", 0.10), pct("damage", 0.10)),
  notable("not_endurance",  "+20% HP, +5% DPS",         "Endurance",       pct("hp", 0.20), pct("dps", 0.05)),
  notable("not_greed",      "+20% Gold, +10% XP",       "Greed",           pct("goldFind", 0.20), pct("xpGain", 0.10)),
  notable("not_storm",      "+15% Lightning Dmg",       "Storm Conduit",   pct("lightningDmg", 0.15)),
  notable("not_deepwound",  "+25% Crit Damage",         "Deep Wounds",     pct("critMulti", 0.25)),
  notable("not_fortify",    "+30% HP",                  "Fortify",         pct("hp", 0.30)),
  notable("not_momentum",   "+15% DPS",                 "Momentum",        pct("dps", 0.15)),

  notable("not_venom",      "+10% Dmg, +5% Crit",       "Venom Strike",    pct("damage", 0.10), pct("critChance", 0.05)),
  notable("not_arcshield",  "+20% HP, +10% Gold",        "Arcane Shield",   pct("hp", 0.20), pct("goldFind", 0.10)),
  notable("not_frostbite",  "+15% Cold Dmg",             "Frostbite",       pct("coldDmg", 0.15)),
  notable("not_battlecry",  "+15% Dmg, +10% DPS",        "Battle Cry",      pct("damage", 0.15), pct("dps", 0.10)),
  notable("not_innerfire",  "+12% DPS, +8% Fire Dmg",    "Inner Fire",      pct("dps", 0.12), pct("fireDmg", 0.08)),
  notable("not_titan",      "+18% Damage",               "Titan Grip",      pct("damage", 0.18)),
  notable("not_sixth",      "+20% Crit Chance",          "Sixth Sense",     pct("critChance", 0.20)),
  notable("not_thick",      "+35% HP",                   "Thick Skin",      pct("hp", 0.35)),
];

// ── Keystone pool (8) ────────────────────────────────────

export const KEYSTONE_POOL: NodeDef[] = [
  keystone("ks_berserk",   "2x Dmg at low HP",       "Berserker Rage",   pct("damage", 1.00)),
  keystone("ks_perfect",   "Crits deal 3x",          "Perfect Aim",      pct("critMulti", 1.00)),
  keystone("ks_undying",   "+100% HP, -20% Dmg",     "Undying Will",     pct("hp", 1.00), pct("damage", -0.20)),
  keystone("ks_midas",     "2x Gold Find",           "Midas Touch",      pct("goldFind", 1.00)),
  keystone("ks_inferno",   "+60% Fire Dmg, +20% HP", "Infernal Crown",   pct("fireDmg", 0.60), pct("hp", 0.20)),
  keystone("ks_soul",      "Kills heal 5% HP",       "Soul Eater",       pct("hp", 0.50)),
  keystone("ks_chaos",     "+50% All Damage",        "Chaos Lord",       pct("damage", 0.50)),
  keystone("ks_student",   "3x XP Gain",             "Eternal Student",  pct("xpGain", 2.00)),
];

// ── Class-specific skill pools (16 per class) ────────────

export const CLASS_SKILLS: Record<string, NodeDef[]> = {

  /** Samurai — lightning + physical, crit-focused swift blade */
  samurai: [
    classSkill("sam_iaido",     "First strike +40% Dmg",         "Iaido",           pct("damage", 0.40)),
    classSkill("sam_bushido",   "+15% Crit when full HP",        "Bushido",         pct("critChance", 0.15)),
    classSkill("sam_windcut",   "+20% Lightning Dmg",            "Windcutter",      pct("lightningDmg", 0.20)),
    classSkill("sam_spirslash", "+25% Crit Damage",              "Spirit Slash",    pct("critMulti", 0.25)),
    classSkill("sam_zen",       "+10% All Damage",               "Zen Focus",       pct("damage", 0.10)),
    classSkill("sam_bladestm",  "+30% DPS",                      "Blade Storm",     pct("dps", 0.30)),
    classSkill("sam_honor",     "+20% HP",                       "Honor Guard",     pct("hp", 0.20)),
    classSkill("sam_sakura",    "+12% Lightning, +8% Crit",      "Sakura Wind",     pct("lightningDmg", 0.12), pct("critChance", 0.08)),
    classSkill("sam_ronin",     "+15% Dmg, -10% HP",             "Ronin Path",      pct("damage", 0.15), pct("hp", -0.10)),
    classSkill("sam_steel",     "+18% Crit Damage",              "Steel Tempest",   pct("critMulti", 0.18)),
    classSkill("sam_katana",    "+22% Damage",                   "Katana Mastery",  pct("damage", 0.22)),
    classSkill("sam_shadow",    "+15% DPS",                      "Shadow Clone",    pct("dps", 0.15)),
    classSkill("sam_ironwill",  "+25% HP, +5% Dmg",              "Iron Will",       pct("hp", 0.25), pct("damage", 0.05)),
    classSkill("sam_thunder",   "+25% Lightning Dmg",            "Thunder Strike",  pct("lightningDmg", 0.25)),
    classSkill("sam_rising",    "+12% Dmg, +12% Crit, +12% HP", "Rising Sun",      pct("damage", 0.12), pct("critChance", 0.12), pct("hp", 0.12)),
    classSkill("sam_death",     "Crits +35% Dmg",                "Death Blossom",   pct("critMulti", 0.35)),
  ],

  /** Warrior — fire + physical, tanky HP fortress */
  warrior: [
    classSkill("war_shield",    "+35% HP",                        "Shield Wall",     pct("hp", 0.35)),
    classSkill("war_warcry",    "+12% Dmg, +12% HP",              "Warcry",          pct("damage", 0.12), pct("hp", 0.12)),
    classSkill("war_heavy",     "+30% Damage",                    "Heavy Strike",    pct("damage", 0.30)),
    classSkill("war_bulwark",   "+40% HP, +10% Fire Dmg",         "Bulwark",         pct("hp", 0.40), pct("fireDmg", 0.10)),
    classSkill("war_forge",     "+20% Fire Dmg, +10% Dmg",        "Forge Strike",    pct("fireDmg", 0.20), pct("damage", 0.10)),
    classSkill("war_reckon",    "+25% Crit Damage",                "Reckoning",       pct("critMulti", 0.25)),
    classSkill("war_fort",      "+30% HP",                         "Fortitude",       pct("hp", 0.30)),
    classSkill("war_cleave",    "+20% DPS",                        "Cleave",          pct("dps", 0.20)),
    classSkill("war_fortress",  "+50% HP, -15% Dmg",               "Iron Fortress",   pct("hp", 0.50), pct("damage", -0.15)),
    classSkill("war_hardened",  "+15% HP, +10% Dodge",             "Battle Hardened", pct("hp", 0.15), pct("dodge", 0.10)),
    classSkill("war_titan",     "+25% Damage",                     "Titan Strength",  pct("damage", 0.25)),
    classSkill("war_last",      "+40% Dmg at low HP",              "Last Stand",      pct("damage", 0.40)),
    classSkill("war_crush",     "+18% Crit Chance",                "Armor Crush",     pct("critChance", 0.18)),
    classSkill("war_rally",     "+15% DPS, +10% HP",               "Rallying Cry",    pct("dps", 0.15), pct("hp", 0.10)),
    classSkill("war_quake",     "+25% Damage",                     "Earthquake",      pct("damage", 0.25)),
    classSkill("war_unstop",    "+25% Fire Dmg, +20% HP",          "Unstoppable",     pct("fireDmg", 0.25), pct("hp", 0.20)),
  ],

  /** Mage — fire/lightning/cold master, pure elemental diversity */
  mage: [
    classSkill("mag_fireball",  "+30% Fire Damage",                "Fireball",        pct("fireDmg", 0.30)),
    classSkill("mag_mshield",   "+25% HP",                         "Mana Shield",     pct("hp", 0.25)),
    classSkill("mag_surge",     "+20% DPS",                        "Arcane Surge",    pct("dps", 0.20)),
    classSkill("mag_frost",     "+25% Cold Damage",                "Frost Nova",      pct("coldDmg", 0.25)),
    classSkill("mag_lbolt",     "+25% Lightning Damage",           "Lightning Bolt",  pct("lightningDmg", 0.25)),
    classSkill("mag_echo",      "+15% Fire, +15% Lightning",       "Spell Echo",      pct("fireDmg", 0.15), pct("lightningDmg", 0.15)),
    classSkill("mag_elemfury",  "+35% Crit Damage",                "Elemental Fury",  pct("critMulti", 0.35)),
    classSkill("mag_barrier",   "+30% HP, +5% DPS",                "Barrier",         pct("hp", 0.30), pct("dps", 0.05)),
    classSkill("mag_chain",     "+25% Lightning Dmg",              "Chain Lightning", pct("lightningDmg", 0.25)),
    classSkill("mag_inferno",   "+20% Fire Dmg, +10% Crit",        "Inferno",         pct("fireDmg", 0.20), pct("critChance", 0.10)),
    classSkill("mag_blizzard",  "+20% Cold Dmg, +15% HP",          "Blizzard",        pct("coldDmg", 0.20), pct("hp", 0.15)),
    classSkill("mag_icearmor",  "+35% HP",                          "Ice Armor",       pct("hp", 0.35)),
    classSkill("mag_overchg",   "+40% Crit Damage",                 "Overcharge",      pct("critMulti", 0.40)),
    classSkill("mag_meteor",    "+35% Fire Damage",                  "Meteor",          pct("fireDmg", 0.35)),
    classSkill("mag_wisdom",    "+20% XP, +10% Gold",               "Arcane Wisdom",   pct("xpGain", 0.20), pct("goldFind", 0.10)),
    classSkill("mag_void",      "+20% Pure Dmg, +10% DPS",          "Void Rift",       pct("pureDmg", 0.20), pct("dps", 0.10)),
  ],

  /** Archer — cold + physical, crit/dodge ranged precision */
  archer: [
    classSkill("arc_power",     "+25% Damage",                      "Power Shot",      pct("damage", 0.25)),
    classSkill("arc_frost",     "+20% Cold Damage",                 "Frost Arrow",     pct("coldDmg", 0.20)),
    classSkill("arc_hawk",      "+25% Crit Chance",                 "Hawk Eye",        pct("critChance", 0.25)),
    classSkill("arc_poison",    "+20% DPS",                         "Poison Arrow",    pct("dps", 0.20)),
    classSkill("arc_evasion",   "+20% HP, +5% Dodge",               "Evasion",         pct("hp", 0.20), pct("dodge", 0.05)),
    classSkill("arc_multi",     "+25% DPS",                         "Multishot",       pct("dps", 0.25)),
    classSkill("arc_sniper",    "+35% Crit Damage",                 "Sniper",          pct("critMulti", 0.35)),
    classSkill("arc_wind",      "+15% Cold Dmg, +10% Crit",         "Wind Walk",       pct("coldDmg", 0.15), pct("critChance", 0.10)),
    classSkill("arc_pierce",    "+30% Damage",                      "Piercing Shot",   pct("damage", 0.30)),
    classSkill("arc_trap",      "+15% DPS, +15% Gold",              "Trap Master",     pct("dps", 0.15), pct("goldFind", 0.15)),
    classSkill("arc_rain",      "+30% Damage",                      "Arrow Rain",      pct("damage", 0.30)),
    classSkill("arc_camo",      "+15% Crit, +10% Dodge",            "Camouflage",      pct("critChance", 0.15), pct("dodge", 0.10)),
    classSkill("arc_blizzard",  "+25% Cold Damage",                 "Ice Barrage",     pct("coldDmg", 0.25)),
    classSkill("arc_headshot",  "+40% Crit Damage",                 "Headshot",        pct("critMulti", 0.40)),
    classSkill("arc_nature",    "+25% HP, +10% XP",                 "Nature Bond",     pct("hp", 0.25), pct("xpGain", 0.10)),
    classSkill("arc_volley",    "+20% Dmg, +15% DPS",               "Volley",          pct("damage", 0.20), pct("dps", 0.15)),
  ],
};

// ── Bonus aggregation utility ─────────────────────────────

/**
 * Sum all stat bonuses from allocated skill tree nodes.
 *
 * @param   nodes      — full node array from buildSkillTree().nodes
 * @param   allocated  — set of allocated numeric node IDs
 * @returns bonuses with percent and flat records
 */
export function computeAllocatedBonuses(
  nodes: { type: string; mods: StatModifier[]; stat: string | null; value: number }[],
  allocated: Set<number>,
): { percent: Record<string, number>; flat: Record<string, number> } {
  const percent: Record<string, number> = {};
  const flat: Record<string, number> = {};

  for (const nodeId of allocated) {
    const node = nodes[nodeId];
    if (!node || node.type === "start") continue;

    const mods = node.mods;
    if (mods && mods.length > 0) {
      for (const mod of mods) {
        const key = STAT_TO_PLAYER[mod.stat] || mod.stat;
        if (mod.mode === "flat") {
          flat[key] = (flat[key] || 0) + mod.value;
        } else {
          percent[key] = (percent[key] || 0) + mod.value;
        }
      }
    } else if (node.stat) {
      // Legacy fallback for nodes without mods array
      const key = STAT_TO_PLAYER[node.stat] || node.stat;
      percent[key] = (percent[key] || 0) + node.value;
    }
  }

  return { percent, flat };
}
