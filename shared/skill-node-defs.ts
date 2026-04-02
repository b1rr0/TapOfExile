/**
 * Skill Node Definitions - OOP data model for asterism stat bonuses.
 *
 * Each node in the asterism carries a NodeDef that describes its stat effects.
 * NodeDef holds one or more StatModifiers, enabling proper multi-stat support.
 *
 * Usage:
 *   const bonuses = computeAllocatedBonuses(tree.nodes, allocatedSet);
 *   // bonuses.percent = { tapDamage: 0.23, critChance: 0.15, ... }
 *   // Apply:  finalStat = baseStat * (1 + bonuses.percent[key])
 */

import type { ModMode } from "./types";
import { ACTIVE_SKILLS, CLASS_ACTIVE_SKILLS, type ActiveSkillId } from "./active-skills";

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
  /** For activeSkill nodes - references the ActiveSkillId this node unlocks */
  activeSkillId: ActiveSkillId | null;

  constructor(id: string, label: string, name: string | null, type: string, ...mods: StatModifier[]) {
    this.id = id;
    this.label = label;
    this.name = name;
    this.type = type;
    this.mods = mods;

    // Backward compat - first modifier as .stat / .value
    this.stat = mods.length > 0 ? mods[0].stat : null;
    this.value = mods.length > 0 ? mods[0].value : 0;

    this.activeSkillId = null;
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

export function figureEntry(id: string, label: string): NodeDef {
  return new NodeDef(id, label, null, "figureEntry");
}

export function activeSkillNode(id: string, label: string, name: string, skillId: ActiveSkillId): NodeDef {
  const def = new NodeDef(id, label, name, "activeSkill");
  def.activeSkillId = skillId;
  return def;
}

// ── Stat key → player property mapping ────────────────────

export const STAT_TO_PLAYER: Record<string, string> = {
  damage:      "tapDamage",
  tapHit:      "tapHit",      // flat tap damage boost (+N per tap)
  critChance:  "critChance",
  critMulti:   "critMultiplier",
  hp:          "hp",
  goldFind:    "goldFind",
  xpGain:      "xpGain",
  dodge:       "dodgeChance",
  armor:       "armor",
  blockChance: "blockChance",   // +X% block chance from tree
  lifeOnHit:   "lifeOnHit",
  fireDmg:     "fireDmg",
  lightningDmg:"lightningDmg",
  coldDmg:     "coldDmg",
  pureDmg:     "pureDmg",     // TODO: not yet applied server-side; mage mag_void uses this
  // Weapon-type multiplier bonuses (percent mode → stacks → applied as multiplier)
  swordDmg:    "swordDmg",
  axeDmg:      "axeDmg",
  daggerDmg:   "daggerDmg",
  wandDmg:     "wandDmg",
  maceDmg:     "maceDmg",
  bowDmg:      "bowDmg",
  staffDmg:    "staffDmg",
  // Weapon-type amplifiers (notable bonus: multiplies all weapon-type bonuses)
  swordAmp:    "swordAmp",
  axeAmp:      "axeAmp",
  daggerAmp:   "daggerAmp",
  wandAmp:     "wandAmp",
  maceAmp:     "maceAmp",
  bowAmp:      "bowAmp",
  staffAmp:    "staffAmp",
  // Unique passive mechanics (flat mode, value = magnitude)
  thorns:            "thorns",            // reflect X% damage taken
  lifeSteal:         "lifeSteal",         // heal X% of damage dealt
  multiStrike:       "multiStrike",       // X% chance to hit twice
  luckyHits:         "luckyHits",         // roll crit twice, take better
  execute:           "execute",           // +X% dmg to enemies <30% HP
  armorDouble:       "armorDouble",       // armor effectiveness ×2
  shieldBash:        "shieldBash",        // block deals X% damage back
  firstStrike:       "firstStrike",       // first hit per monster deals Xx
  critHeal:          "critHeal",          // heal flat HP on crit
  regenBoost:        "regenBoost",        // life regen ×X
  fireFromLightning: "fireFromLightning", // fire bonus = lightning bonus
  coldFromFire:      "coldFromFire",      // cold bonus = fire bonus
  lightningFromCold: "lightningFromCold", // lightning bonus = cold bonus
  allElemental:      "allElemental",      // all elements = highest
  penetration:       "penetration",       // ignore X% enemy resistance
  bossSlayer:        "bossSlayer",        // +X% damage to bosses
  secondWind:        "secondWind",        // X% survive lethal at 1HP
  overkill:          "overkill",          // excess kill dmg → next enemy
  critExplosion:     "critExplosion",     // crits deal X% burst AoE
  dodgeCounter:      "dodgeCounter",      // on dodge, deal X% damage
  // New unique mechanics (competitor-inspired)
  glancingBlows:     "glancingBlows",     // 2× block chance, blocks prevent 50%
  cullingStrike:     "cullingStrike",     // enemies below 10% HP die instantly
  berserkerFury:     "berserkerFury",     // +1% dmg per 2% missing HP
  dualWield2H:       "dualWield2H",       // can equip 2H in off-hand
  // Arcane crit (mage-only: arcane skills use these instead of regular crits)
  arcaneCritChance:  "arcaneCritChance",  // arcane crit chance (0..1)
  arcaneCritMulti:   "arcaneCritMultiplier", // arcane crit multiplier (e.g. 0.50 = +50%)
  // Cooldown reduction (percent mode, value = fraction e.g. 0.15 = 15% CDR)
  cooldownReduction: "cooldownReduction", // reduce skill cooldowns by X%
  // Spell level bonuses (flat mode)
  weaponSpellLevel:     "weaponSpellLevel",     // +N Bugei Spell Level
  arcaneSpellLevel:     "arcaneSpellLevel",     // +N Arcane Spell Level
  versatileSpellLevel:  "versatileSpellLevel",  // +N Versatile Spell Level
};

// ── Minor pool (16) ──────────────────────────────────────

export const MINOR_POOL: NodeDef[] = [
  minor("min_dmg_3",    "+3% Bugei Damage",          pct("damage", 0.03)),
  minor("min_crit_5",   "+5% Bugei Crit Chance",     pct("critChance", 0.05)),
  minor("min_critd_8",  "+8% Bugei Crit Damage",     pct("critMulti", 0.08)),
  minor("min_fire_5",   "+5% Fire Damage",     pct("fireDmg", 0.05)),
  minor("min_hp_10",    "+10% HP",             pct("hp", 0.10)),
  minor("min_gold_5",   "+5% Gold Find",       pct("goldFind", 0.05)),
  minor("min_xp_6",     "+6% XP Gain",         pct("xpGain", 0.06)),
  minor("min_hit_30",   "+15 Hit (tap)",        flat("tapHit", 15)),  // nerfed: was 20, reduced for early-tree balance
  minor("min_dmg_4",    "+4% Bugei Damage",          pct("damage", 0.04)),
  minor("min_crit_3",   "+3% Bugei Crit Chance",     pct("critChance", 0.03)),
  minor("min_critd_6",  "+6% Bugei Crit Damage",     pct("critMulti", 0.06)),
  minor("min_ltn_5",    "+5% Lightning Damage",pct("lightningDmg", 0.05)),
  minor("min_hp_8",     "+8% HP",              pct("hp", 0.08)),
  minor("min_gold_4",   "+4% Gold Find",       pct("goldFind", 0.04)),
  minor("min_cold_5",   "+5% Cold Damage",     pct("coldDmg", 0.05)),
  minor("min_hit_40",   "+15 Hit (tap)",        flat("tapHit", 15)),  // nerfed: was 20, reduced for early-tree balance
  // Arcane crit minors
  minor("min_arccrit_5",  "+5% Arcane Crit Chance",       pct("arcaneCritChance", 0.05)),
  minor("min_arccritd_8", "+8% Arcane Crit Damage",   pct("arcaneCritMulti", 0.08)),
];

// ── Notable pool (27) ────────────────────────────────────

export const NOTABLE_POOL: NodeDef[] = [
  notable("not_razor",      "+12% Bugei Damage",              "Razor Edge",       pct("damage", 0.12)),
  notable("not_eagle",      "+7% Bugei Crit Chance",          "Eagle Eye",        pct("critChance", 0.07)),
  notable("not_brutal",     "+20% Bugei Crit Damage",         "Brutal Force",     pct("critMulti", 0.20)),
  notable("not_pyre",       "+15% Fire Damage",         "Pyre",             pct("fireDmg", 0.15)),
  notable("not_iron",       "+25% HP",                  "Iron Skin",        pct("hp", 0.25)),
  notable("not_fortune",    "+15% Gold Find",           "Fortune Seeker",   pct("goldFind", 0.15)),
  notable("not_learner",    "+18% XP Gain",             "Quick Learner",    pct("xpGain", 0.18)),
  notable("not_relentless", "+33 Hit (tap)",            "Relentless",       flat("tapHit", 33)),

  notable("not_blood",      "+8% Bugei Dmg, +15% HP",         "Blood Frenzy",    pct("damage", 0.08),  pct("hp", 0.15)),
  notable("not_precision",  "+6% Bugei Crit Chance, +10% Bugei Dmg",   "Precision",  pct("critChance", 0.06), pct("damage", 0.10)),
  notable("not_endurance",  "+20% HP, +20 Hit",         "Endurance",       pct("hp", 0.20), flat("tapHit", 20)),
  notable("not_greed",      "+20% Gold, +10% XP",       "Greed",           pct("goldFind", 0.20), pct("xpGain", 0.10)),
  notable("not_storm",      "+15% Lightning Dmg",       "Storm Conduit",   pct("lightningDmg", 0.15)),
  notable("not_deepwound",  "+25% Bugei Crit Damage",         "Deep Wounds",     pct("critMulti", 0.25)),
  notable("not_fortify",    "+30% HP",                  "Fortify",         pct("hp", 0.30)),
  notable("not_momentum",   "+50 Hit (tap)",            "Momentum",        flat("tapHit", 50)),

  notable("not_venom",      "+10% Bugei Dmg, +5% Bugei Crit Chance",  "Venom Strike",    pct("damage", 0.10), pct("critChance", 0.05)),  // 5% (mixed)
  notable("not_arcshield",  "+20% HP, +10% Gold",        "Arcane Shield",   pct("hp", 0.20), pct("goldFind", 0.10)),
  notable("not_frostbite",  "+15% Cold Dmg",             "Frostbite",       pct("coldDmg", 0.15)),
  notable("not_battlecry",  "+15% Bugei Dmg, +33 Hit",         "Battle Cry",      pct("damage", 0.15), flat("tapHit", 33)),
  notable("not_innerfire",  "+40 Hit, +8% Fire Dmg",     "Inner Fire",      flat("tapHit", 40), pct("fireDmg", 0.08)),
  notable("not_temporal",   "+15% Cooldown Reduction",    "Temporal Flow",   pct("cooldownReduction", 0.15)),
  notable("not_sixth",      "+7% Bugei Crit Chance",           "Sixth Sense",     pct("critChance", 0.07)),
  notable("not_thick",      "+35% HP",                   "Thick Skin",      pct("hp", 0.35)),
  // Spell level notables
  notable("not_balanced",   "+2 Versatile Spell Lv.",     "Balanced Power",  flat("versatileSpellLevel", 2)),
  notable("not_martial",    "+2 Bugei Spell Lv.",        "Bugei Discipline", flat("weaponSpellLevel", 2)),
  notable("not_arcane_pw",  "+2 Arcane Spell Lv.",        "Spell Mastery",   flat("arcaneSpellLevel", 2)),
  // Arcane crit notables
  notable("not_arccrit",    "+7% Arcane Crit Chance",    "Arcane Precision", pct("arcaneCritChance", 0.07)),
  notable("not_arccritd",   "+20% Arcane Crit Damage",       "Arcane Fury",      pct("arcaneCritMulti", 0.20)),
];

// ── Keystone pool (48) ───────────────────────────────────

export const KEYSTONE_POOL: NodeDef[] = [
  // ── Set 1: single-stat keystones (8) ──
  keystone("ks_berserk",    "2x Bugei Dmg at low HP",       "Berserker Rage",     pct("damage", 1.00)),
  keystone("ks_perfect",    "+35% Bugei Crit Damage",       "Perfect Aim",        pct("critMulti", 0.35)),
  keystone("ks_undying",    "+100% HP, -20% Bugei Dmg",     "Undying Will",       pct("hp", 1.00), pct("damage", -0.20)),
  keystone("ks_midas",      "2x Gold Find",           "Midas Touch",        pct("goldFind", 1.00)),
  keystone("ks_inferno",    "+60% Fire Dmg, +20% HP", "Infernal Crown",     pct("fireDmg", 0.60), pct("hp", 0.20)),
  keystone("ks_soul",       "Kills heal 5% HP",       "Soul Eater",         pct("hp", 0.50)),
  keystone("ks_chaos",      "+50% Bugei Damage",        "Chaos Lord",         pct("damage", 0.50)),
  keystone("ks_student",    "3x XP Gain",             "Eternal Student",    pct("xpGain", 2.00)),

  // ── Set 2: elemental + hybrid (8) ──
  keystone("ks_thunder",    "+50% Lightning Dmg",     "Thunder God",        pct("lightningDmg", 0.50)),
  keystone("ks_frost",      "+50% Cold Dmg",          "Frost Emperor",      pct("coldDmg", 0.50)),
  keystone("ks_ghost",      "+15% Bugei Crit Chance",       "Ghost Step",         pct("critChance", 0.15)),
  keystone("ks_warlord",    "+50 Hit (tap)",          "Warlord",            flat("tapHit", 50)),
  keystone("ks_bloodking",  "+75% HP, +15% Bugei Dmg",      "Blood King",         pct("hp", 0.75), pct("damage", 0.15)),
  keystone("ks_executioner", "+35% Bugei Crit Damage",      "Executioner",        pct("critMulti", 0.35)),
  keystone("ks_ironwill",   "+120% HP, no Bugei crit",      "Iron Will",          pct("hp", 1.20), pct("critChance", -0.50)),
  keystone("ks_fortune2",   "+80% Gold, +40% XP",     "Golden Age",         pct("goldFind", 0.80), pct("xpGain", 0.40)),

  // ── Set 3: dual-stat (8) ──
  keystone("ks_timewarp",   "+25% CDR, +15% Bugei Dmg",    "Time Warp",          pct("cooldownReduction", 0.25), pct("damage", 0.15)),
  keystone("ks_blizzard",   "+40% Cold, +30% HP",     "Blizzard Heart",     pct("coldDmg", 0.40), pct("hp", 0.30)),
  keystone("ks_tempest",    "+40% Lghtng, +12% Bugei Crit Chance", "Tempest Lord",       pct("lightningDmg", 0.40), pct("critChance", 0.12)),
  keystone("ks_titan",      "+60% HP, +50 Hit",      "Titan Grip",         pct("hp", 0.60), flat("tapHit", 50)),
  keystone("ks_shadow",     "+35% Bugei Crit Damage, +30% Bugei Dmg","Shadow Master",      pct("critMulti", 0.35), pct("damage", 0.30)),
  keystone("ks_phoenix",    "+50% Fire, +50% HP",     "Phoenix Rising",     pct("fireDmg", 0.50), pct("hp", 0.50)),
  keystone("ks_scholar",    "2x XP, +30% Gold",       "Grand Scholar",      pct("xpGain", 1.00), pct("goldFind", 0.30)),
  keystone("ks_destroyer",  "+70% Bugei Damage",            "World Destroyer",    pct("damage", 0.70)),

  // ── Set 4: advanced keystones (8) ──
  keystone("ks_avalanche",  "+45% Cold, +15% Bugei Dmg",    "Avalanche",          pct("coldDmg", 0.45), pct("damage", 0.15)),
  keystone("ks_voltage",    "+45% Lightning, +50 Hit","Voltage Surge",      pct("lightningDmg", 0.45), flat("tapHit", 50)),
  keystone("ks_voidwalker", "+60% Bugei Dmg, -30% HP",      "Void Walker",        pct("damage", 0.60), pct("hp", -0.30)),
  keystone("ks_oathkeeper", "+80% HP, +10% Gold",     "Oathkeeper",         pct("hp", 0.80), pct("goldFind", 0.10)),
  keystone("ks_sunfire",    "+35% Fire, +12% Bugei Crit Chance",   "Sunfire",            pct("fireDmg", 0.35), pct("critChance", 0.12)),
  keystone("ks_nightblade", "+35% Bugei Crit Damage, +50 Hit","Nightblade",         pct("critMulti", 0.35), flat("tapHit", 50)),
  keystone("ks_sage",       "2.5x XP",                "Sage of Ages",       pct("xpGain", 1.50)),
  keystone("ks_dragon",     "+40% Fire, +20% Lghtng", "Dragon Breath",      pct("fireDmg", 0.40), pct("lightningDmg", 0.20)),

  // ── Set 5: offensive keystones (8) ──
  keystone("ks_reaper",     "+55% Bugei Dmg, +12% Bugei Crit Chance",    "Reaper",             pct("damage", 0.55), pct("critChance", 0.12)),
  keystone("ks_glacial",    "+55% Cold, +10% Bugei Crit Chance",   "Glacial Core",       pct("coldDmg", 0.55), pct("critChance", 0.10)),
  keystone("ks_mjolnir",    "+55% Lghtng, +25% Bugei Dmg",  "Mjolnir",            pct("lightningDmg", 0.55), pct("damage", 0.25)),
  keystone("ks_golem",      "+90% HP",                "Stone Golem",        pct("hp", 0.90)),
  keystone("ks_plunder",    "+90% Gold",              "Grand Plunder",      pct("goldFind", 0.90)),
  keystone("ks_frenzy",     "+50 Hit, +15% Bugei Dmg",     "Blood Frenzy",       flat("tapHit", 50), pct("damage", 0.15)),
  keystone("ks_nova",       "+30% Fire, +30% Cold",    "Elemental Nova",     pct("fireDmg", 0.30), pct("coldDmg", 0.30)),
  keystone("ks_dervish",    "+50 Hit, -20% HP",       "Whirling Dervish",   flat("tapHit", 50), pct("hp", -0.20)),

  // ── Set 6: defensive/utility keystones (8) ──
  keystone("ks_bulwark",    "+70% HP, +33 Hit",       "Living Bulwark",     pct("hp", 0.70), flat("tapHit", 33)),
  keystone("ks_hourglass",  "+30% CDR, +30% XP",       "Eternal Hourglass",  pct("cooldownReduction", 0.30), pct("xpGain", 0.30)),
  keystone("ks_predator",   "+35% Bugei Crit Damage",           "Apex Predator",      pct("critMulti", 0.35)),
  keystone("ks_wardstone",  "+100% HP, +10% Dodge",    "Ancient Wardstone",  pct("hp", 1.00), pct("dodge", 0.10)),
  keystone("ks_cinder",     "+50% Fire, +10% Bugei Crit Chance",    "Cinder Lord",        pct("fireDmg", 0.50), pct("critChance", 0.10)),
  keystone("ks_permafrost", "+50% Cold, +50 Hit",     "Permafrost",         pct("coldDmg", 0.50), flat("tapHit", 50)),
  keystone("ks_arclight",   "+50% Lghtng, +20% HP",    "Arclight Sentinel",  pct("lightningDmg", 0.50), pct("hp", 0.20)),
  keystone("ks_zenith",     "+35% Bugei Dmg, +12% Bugei Crit Chance, +15% HP", "Zenith",       pct("damage", 0.35), pct("critChance", 0.12), pct("hp", 0.15)),
  // Arcane crit keystones
  keystone("ks_arccrit",    "+15% Arcane Crit Chance, +30% Bugei Dmg",  "Arcane Dominion", pct("arcaneCritChance", 0.15), pct("damage", 0.30)),
  keystone("ks_arccritd",   "+35% Arcane Crit Damage",        "Spell Annihilator", pct("arcaneCritMulti", 0.35)),
];

// ── Figure entry pool (15) - gateways with no stat bonuses ──

export const FIGURE_ENTRY_POOL: NodeDef[] = [
  figureEntry("fe_shield",     "Shield Gate"),
  figureEntry("fe_sword",      "Sword Gate"),
  figureEntry("fe_circle",     "Circle Gate"),
  figureEntry("fe_diamond",    "Diamond Gate"),
  figureEntry("fe_crescent",   "Crescent Gate"),
  figureEntry("fe_star",       "Star Gate"),
  figureEntry("fe_serpent",    "Serpent Gate"),
  figureEntry("fe_crown",     "Crown Gate"),
  figureEntry("fe_eye",       "Eye Gate"),
  figureEntry("fe_flame",     "Flame Gate"),
  figureEntry("fe_frost",     "Frost Gate"),
  figureEntry("fe_storm",     "Storm Gate"),
  figureEntry("fe_skull",     "Skull Gate"),
  figureEntry("fe_wing",      "Wing Gate"),
  figureEntry("fe_anchor",    "Anchor Gate"),
];

// ── Class-specific skill pools (17 per class) ────────────

export const CLASS_SKILLS: Record<string, NodeDef[]> = {

  /** Samurai - lightning + physical, crit-focused swift blade */
  samurai: [
    classSkill("sam_iaido",     "First strike +40% Bugei Dmg",         "Iaido",           pct("damage", 0.40)),
    classSkill("sam_bushido",   "+15% Bugei Crit Chance when full HP",  "Bushido",         pct("critChance", 0.15)),
    classSkill("sam_windcut",   "+20% Lightning Dmg",            "Windcutter",      pct("lightningDmg", 0.20)),
    classSkill("sam_spirslash", "+25% Bugei Crit Damage",              "Spirit Slash",    pct("critMulti", 0.25)),
    classSkill("sam_zen",       "+10% Bugei Damage",               "Zen Focus",       pct("damage", 0.10)),
    classSkill("sam_bladestm",  "+50 Hit (tap)",                 "Blade Storm",     flat("tapHit", 50)),
    classSkill("sam_honor",     "+20% HP",                       "Honor Guard",     pct("hp", 0.20)),
    classSkill("sam_sakura",    "+12% Lightning, +8% Bugei Crit Chance",  "Sakura Wind",     pct("lightningDmg", 0.12), pct("critChance", 0.08)),
    classSkill("sam_ronin",     "+15% Bugei Dmg, -10% HP",             "Ronin Path",      pct("damage", 0.15), pct("hp", -0.10)),
    classSkill("sam_steel",     "+18% Bugei Crit Damage",              "Steel Tempest",   pct("critMulti", 0.18)),
    classSkill("sam_katana",    "+22% Bugei Damage",                   "Katana Mastery",  pct("damage", 0.22)),
    classSkill("sam_shadow",    "+50 Hit (tap)",                 "Shadow Clone",    flat("tapHit", 50)),
    classSkill("sam_ironwill",  "+25% HP, +5% Bugei Dmg",              "Iron Will",       pct("hp", 0.25), pct("damage", 0.05)),
    classSkill("sam_thunder",   "+25% Lightning Dmg",            "Thunder Strike",  pct("lightningDmg", 0.25)),
    classSkill("sam_rising",    "+12% Bugei Dmg, +12% Bugei Crit Chance, +12% HP", "Rising Sun",      pct("damage", 0.12), pct("critChance", 0.12), pct("hp", 0.12)),
    classSkill("sam_death",     "Bugei Crits +35% Dmg",                "Death Blossom",   pct("critMulti", 0.35)),
    classSkill("sam_versatile", "+3 Versatile Spell Lv.",        "Balanced Blade",  flat("versatileSpellLevel", 3)),
  ],

  /** Warrior - fire + physical, tanky HP fortress */
  warrior: [
    classSkill("war_shield",    "+35% HP",                        "Shield Wall",     pct("hp", 0.35)),
    classSkill("war_warcry",    "+12% Bugei Dmg, +12% HP",              "Warcry",          pct("damage", 0.12), pct("hp", 0.12)),
    classSkill("war_heavy",     "+30% Bugei Damage",                    "Heavy Strike",    pct("damage", 0.30)),
    classSkill("war_bulwark",   "+40% HP, +10% Fire Dmg",         "Bulwark",         pct("hp", 0.40), pct("fireDmg", 0.10)),
    classSkill("war_forge",     "+20% Fire Dmg, +10% Bugei Dmg",        "Forge Strike",    pct("fireDmg", 0.20), pct("damage", 0.10)),
    classSkill("war_reckon",    "+25% Bugei Crit Damage",                "Reckoning",       pct("critMulti", 0.25)),
    classSkill("war_fort",      "+30% HP",                         "Fortitude",       pct("hp", 0.30)),
    classSkill("war_cleave",    "+50 Hit (tap)",                   "Cleave",          flat("tapHit", 50)),
    classSkill("war_fortress",  "+50% HP, -15% Bugei Dmg",               "Iron Fortress",   pct("hp", 0.50), pct("damage", -0.15)),
    classSkill("war_hardened",  "+15% HP, +10% Dodge",             "Battle Hardened", pct("hp", 0.15), pct("dodge", 0.10)),
    classSkill("war_titan",     "+25% Bugei Damage",                     "Titan Strength",  pct("damage", 0.25)),
    classSkill("war_last",      "+40% Bugei Dmg at low HP",              "Last Stand",      pct("damage", 0.40)),
    classSkill("war_crush",     "+18% Bugei Crit Chance",                "Armor Crush",     pct("critChance", 0.18)),
    classSkill("war_rally",     "+50 Hit, +10% HP",               "Rallying Cry",    flat("tapHit", 50), pct("hp", 0.10)),
    classSkill("war_quake",     "+25% Bugei Damage",                     "Earthquake",      pct("damage", 0.25)),
    classSkill("war_unstop",    "+25% Fire Dmg, +20% HP",          "Unstoppable",     pct("fireDmg", 0.25), pct("hp", 0.20)),
    classSkill("war_martial",   "+3 Bugei Spell Lv.",             "Bugei Mastery",  flat("weaponSpellLevel", 3)),
  ],

  /** Mage - fire/lightning/cold master, pure elemental diversity */
  mage: [
    classSkill("mag_fireball",  "+30% Fire Damage",                "Fireball",        pct("fireDmg", 0.30)),
    classSkill("mag_mshield",   "+25% HP",                         "Mana Shield",     pct("hp", 0.25)),
    classSkill("mag_surge",     "+15 Hit (tap)",                   "Arcane Surge",    flat("tapHit", 15)),
    classSkill("mag_frost",     "+25% Cold Damage",                "Frost Nova",      pct("coldDmg", 0.25)),
    classSkill("mag_lbolt",     "+25% Lightning Damage",           "Lightning Bolt",  pct("lightningDmg", 0.25)),
    classSkill("mag_echo",      "+15% Fire, +15% Lightning",       "Spell Echo",      pct("fireDmg", 0.15), pct("lightningDmg", 0.15)),
    classSkill("mag_elemfury",  "+35% Bugei Crit Damage",                "Elemental Fury",  pct("critMulti", 0.35)),
    classSkill("mag_barrier",   "+30% HP, +20 Hit",                "Barrier",         pct("hp", 0.30), flat("tapHit", 20)),
    classSkill("mag_chain",     "+25% Lightning Dmg",              "Chain Lightning", pct("lightningDmg", 0.25)),
    classSkill("mag_inferno",   "+20% Fire Dmg, +10% Bugei Crit Chance",        "Inferno",         pct("fireDmg", 0.20), pct("critChance", 0.10)),
    classSkill("mag_blizzard",  "+20% Cold Dmg, +15% HP",          "Blizzard",        pct("coldDmg", 0.20), pct("hp", 0.15)),
    classSkill("mag_icearmor",  "+35% HP",                          "Ice Armor",       pct("hp", 0.35)),
    classSkill("mag_overchg",   "+35% Bugei Crit Damage",                 "Overcharge",      pct("critMulti", 0.35)),
    classSkill("mag_meteor",    "+35% Fire Damage",                  "Meteor",          pct("fireDmg", 0.35)),
    classSkill("mag_wisdom",    "+20% XP, +10% Gold",               "Arcane Wisdom",   pct("xpGain", 0.20), pct("goldFind", 0.10)),
    classSkill("mag_void",      "+20% Pure Bugei Dmg, +15 Hit",          "Void Rift",       pct("pureDmg", 0.20), flat("tapHit", 15)),
    classSkill("mag_arcpow",    "+3 Arcane Spell Lv.",              "Arcane Power",    flat("arcaneSpellLevel", 3)),
  ],

  /** Archer - cold + physical, crit/dodge ranged precision */
  archer: [
    classSkill("arc_power",     "+25% Bugei Damage",                      "Power Shot",      pct("damage", 0.25)),
    classSkill("arc_frost",     "+20% Cold Damage",                 "Frost Arrow",     pct("coldDmg", 0.20)),
    classSkill("arc_hawk",      "+25% Bugei Crit Chance",                 "Hawk Eye",        pct("critChance", 0.25)),
    classSkill("arc_poison",    "+50 Hit (tap)",                    "Poison Arrow",    flat("tapHit", 50)),
    classSkill("arc_evasion",   "+20% HP, +5% Dodge",               "Evasion",         pct("hp", 0.20), pct("dodge", 0.05)),
    classSkill("arc_multi",     "+50 Hit (tap)",                    "Multishot",       flat("tapHit", 50)),
    classSkill("arc_sniper",    "+35% Bugei Crit Damage",                 "Sniper",          pct("critMulti", 0.35)),
    classSkill("arc_wind",      "+15% Cold Dmg, +10% Bugei Crit Chance",   "Wind Walk",       pct("coldDmg", 0.15), pct("critChance", 0.10)),
    classSkill("arc_pierce",    "+30% Bugei Damage",                      "Piercing Shot",   pct("damage", 0.30)),
    classSkill("arc_trap",      "+50 Hit, +15% Gold",              "Trap Master",     flat("tapHit", 50), pct("goldFind", 0.15)),
    classSkill("arc_rain",      "+30% Bugei Damage",                      "Arrow Rain",      pct("damage", 0.30)),
    classSkill("arc_camo",      "+15% Bugei Crit Chance, +10% Dodge",  "Camouflage",      pct("critChance", 0.15), pct("dodge", 0.10)),
    classSkill("arc_blizzard",  "+25% Cold Damage",                 "Ice Barrage",     pct("coldDmg", 0.25)),
    classSkill("arc_headshot",  "+35% Bugei Crit Damage",                 "Headshot",        pct("critMulti", 0.35)),
    classSkill("arc_nature",    "+25% HP, +10% XP",                 "Nature Bond",     pct("hp", 0.25), pct("xpGain", 0.10)),
    classSkill("arc_volley",    "+20% Bugei Dmg, +50 Hit",               "Volley",          pct("damage", 0.20), flat("tapHit", 50)),
    classSkill("arc_versatile", "+3 Versatile Spell Lv.",           "Nature's Gift",   flat("versatileSpellLevel", 3)),
  ],
};

// ── Active skill node defs (8 per class = 32) ──────────────
//
// Each activeSkill node unlocks an active combat skill. No stat bonuses -
// the node's purpose is gating the skill behind tree allocation.
// Generated from CLASS_ACTIVE_SKILLS mapping.

function buildActiveSkillNodes(): Record<string, NodeDef[]> {
  const result: Record<string, NodeDef[]> = {};
  for (const [cls, skillIds] of Object.entries(CLASS_ACTIVE_SKILLS)) {
    result[cls] = skillIds.map(skillId => {
      const skill = ACTIVE_SKILLS[skillId];
      return activeSkillNode(`as_${skillId}`, skill.name, skill.name, skillId);
    });
  }
  return result;
}

export const ACTIVE_SKILL_NODES: Record<string, NodeDef[]> = buildActiveSkillNodes();

// ── Skill connector stat defs (8 per class = 32) ───────────
//
// Stat bonuses on the path connectors between active skill nodes.
// Index matches connector index (c0-c7) in the class skill mini-tree:
//
//   Start → c0(bridge) → c1 → s0 → c6 → s6
//                       → c2 → s1
//                       → c3 → s2 → c5 → s4/s5
//                       → c4 → s3 → c7 → s7

export const SKILL_CONNECTOR_DEFS: Record<string, NodeDef[]> = {

  /** Mage connectors - fire path (left) + cold path (right) */
  mage: [
    classSkill("sc_mag_0", "+20 Hit (tap)",           "Arcane Flow",    flat("tapHit", 20)),
    classSkill("sc_mag_1", "+8% HP",                 "Mana Well",      pct("hp", 0.08)),
    classSkill("sc_mag_2", "+5% Fire Dmg",           "Spark",          pct("fireDmg", 0.05)),
    classSkill("sc_mag_3", "+5% Fire Dmg",           "Ember Path",     pct("fireDmg", 0.05)),
    classSkill("sc_mag_4", "+5% Cold Dmg",           "Chill Touch",    pct("coldDmg", 0.05)),
    classSkill("sc_mag_5", "+8% Fire, +5% Crit",    "Ignition",       pct("fireDmg", 0.08), pct("critChance", 0.05)),
    classSkill("sc_mag_6", "+6% CritDmg, +5% Fire", "Combustion",     pct("critMulti", 0.06), pct("fireDmg", 0.05)),
    classSkill("sc_mag_7", "+20 Hit (tap)",           "Ether Link",     flat("tapHit", 20)),
  ],

  /** Samurai connectors - physical/crit (left) + lightning (right) */
  samurai: [
    classSkill("sc_sam_0", "+3% Damage",              "Blade Focus",    pct("damage", 0.03)),
    classSkill("sc_sam_1", "+5% Damage",              "Sharp Edge",     pct("damage", 0.05)),
    classSkill("sc_sam_2", "+5% Crit Chance",         "Keen Eye",       pct("critChance", 0.05)),
    classSkill("sc_sam_3", "+5% Lightning Dmg",       "Storm Path",     pct("lightningDmg", 0.05)),
    classSkill("sc_sam_4", "+5% Lightning Dmg",       "Charged Blade",  pct("lightningDmg", 0.05)),
    classSkill("sc_sam_5", "+6% CritDmg, +5% Crit",  "Lethal Point",   pct("critMulti", 0.06), pct("critChance", 0.05)),
    classSkill("sc_sam_6", "+20 Hit (tap)",             "Swift Wind",     flat("tapHit", 20)),
    classSkill("sc_sam_7", "+6% Lightning Dmg",       "Thunder Step",   pct("lightningDmg", 0.06)),
  ],

  /** Warrior connectors - HP/physical tank path */
  warrior: [
    classSkill("sc_war_0", "+5% HP",                  "Iron Resolve",   pct("hp", 0.05)),
    classSkill("sc_war_1", "+5% Damage",              "Heavy Arm",      pct("damage", 0.05)),
    classSkill("sc_war_2", "+8% HP",                  "Tough Hide",     pct("hp", 0.08)),
    classSkill("sc_war_3", "+5% Damage",              "Brute Path",     pct("damage", 0.05)),
    classSkill("sc_war_4", "+5% Dmg, +5% Fire",      "Tempered Steel", pct("damage", 0.05), pct("fireDmg", 0.05)),
    classSkill("sc_war_5", "+8% HP, +5% Damage",     "Battle Stance",  pct("hp", 0.08), pct("damage", 0.05)),
    classSkill("sc_war_6", "+5% HP",                  "Stone Skin",     pct("hp", 0.05)),
    classSkill("sc_war_7", "+10% HP",                 "Endure",         pct("hp", 0.10)),
  ],

  /** Archer connectors - lightning (left) + cold (right) + crit */
  archer: [
    classSkill("sc_arc_0", "+3% Crit Chance",         "Steady Aim",     pct("critChance", 0.03)),
    classSkill("sc_arc_1", "+5% Lightning Dmg",       "Spark Touch",    pct("lightningDmg", 0.05)),
    classSkill("sc_arc_2", "+5% Crit Chance",         "Focus",          pct("critChance", 0.05)),
    classSkill("sc_arc_3", "+5% Cold Dmg",            "Frost Tip",      pct("coldDmg", 0.05)),
    classSkill("sc_arc_4", "+5% Cold Dmg",            "Icy Wind",       pct("coldDmg", 0.05)),
    classSkill("sc_arc_5", "+5% Ltn, +5% Cold",      "Elemental Aim",  pct("lightningDmg", 0.05), pct("coldDmg", 0.05)),
    classSkill("sc_arc_6", "+20 Hit (tap)",             "Quick Draw",     flat("tapHit", 20)),
    classSkill("sc_arc_7", "+5% Lightning Dmg",       "Charged Arrow",  pct("lightningDmg", 0.05)),
  ],
};

// ── Bonus aggregation utility ─────────────────────────────

/**
 * Sum all stat bonuses from allocated asterism nodes.
 *
 * @param   nodes      - full node array from buildSkillTree().nodes
 * @param   allocated  - set of allocated numeric node IDs
 * @returns bonuses with percent and flat records
 */
export function computeAllocatedBonuses(
  nodes: { type: string; mods: StatModifier[]; stat: string | null; value: number }[],
  allocated: Set<number>,
): { percent: Record<string, number>; flat: Record<string, number> } {
  const percent: Record<string, number> = {};
  const flat: Record<string, number> = {};
  // CDR stacks multiplicatively per node: (1-a)×(1-b)×(1-c)
  let cdrMultiplier = 1;

  for (const nodeId of allocated) {
    const node = nodes[nodeId];
    // start/activeSkill grant no passive stats; figureEntry are gateway-only (no mods)
    if (!node || node.type === "start" || node.type === "activeSkill" || node.type === "figureEntry") continue;

    for (const mod of node.mods) {
      const key = STAT_TO_PLAYER[mod.stat] ?? mod.stat;
      // CDR: multiplicative stacking per node (each node reduces remaining cooldown)
      if (key === "cooldownReduction" && mod.mode === "percent") {
        cdrMultiplier *= (1 - mod.value);
        continue;
      }
      if (mod.mode === "flat") {
        flat[key] = (flat[key] ?? 0) + mod.value;
      } else {
        percent[key] = (percent[key] ?? 0) + mod.value;
      }
    }
  }

  // Store CDR as effective fraction (e.g. 3 nodes → 0.15,0.25,0.30 → 1-0.85×0.75×0.70 = 0.5537)
  if (cdrMultiplier < 1) {
    percent["cooldownReduction"] = 1 - cdrMultiplier;
  }

  return { percent, flat };
}
