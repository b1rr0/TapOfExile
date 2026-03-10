/**
 * Skill Node Definitions - OOP data model for skill tree stat bonuses.
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
  dps:         "tapDamage",   // legacy - DPS nodes now boost tap damage
  critChance:  "critChance",
  critMulti:   "critMultiplier",
  hp:          "hp",
  goldFind:    "goldFind",
  xpGain:      "xpGain",
  dodge:       "dodgeChance",
  armor:       "armor",
  lifeOnHit:   "lifeOnHit",
  fireDmg:     "fireDmg",
  lightningDmg:"lightningDmg",
  coldDmg:     "coldDmg",
  pureDmg:     "pureDmg",
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
  // Spell level bonuses (flat mode)
  weaponSpellLevel:     "weaponSpellLevel",     // +N Weapon Spell Level
  arcaneSpellLevel:     "arcaneSpellLevel",     // +N Arcane Spell Level
  versatileSpellLevel:  "versatileSpellLevel",  // +N Versatile Spell Level
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
  // Spell level notables
  notable("not_balanced",   "+2 Versatile Spell Lv.",     "Balanced Power",  flat("versatileSpellLevel", 2)),
  notable("not_martial",    "+2 Weapon Spell Lv.",        "Martial Mastery", flat("weaponSpellLevel", 2)),
  notable("not_arcane_pw",  "+2 Arcane Spell Lv.",        "Spell Mastery",   flat("arcaneSpellLevel", 2)),
];

// ── Keystone pool (48) ───────────────────────────────────

export const KEYSTONE_POOL: NodeDef[] = [
  // ── Set 1: single-stat keystones (8) ──
  keystone("ks_berserk",    "2x Dmg at low HP",       "Berserker Rage",     pct("damage", 1.00)),
  keystone("ks_perfect",    "Crits deal 3x",          "Perfect Aim",        pct("critMulti", 1.00)),
  keystone("ks_undying",    "+100% HP, -20% Dmg",     "Undying Will",       pct("hp", 1.00), pct("damage", -0.20)),
  keystone("ks_midas",      "2x Gold Find",           "Midas Touch",        pct("goldFind", 1.00)),
  keystone("ks_inferno",    "+60% Fire Dmg, +20% HP", "Infernal Crown",     pct("fireDmg", 0.60), pct("hp", 0.20)),
  keystone("ks_soul",       "Kills heal 5% HP",       "Soul Eater",         pct("hp", 0.50)),
  keystone("ks_chaos",      "+50% All Damage",        "Chaos Lord",         pct("damage", 0.50)),
  keystone("ks_student",    "3x XP Gain",             "Eternal Student",    pct("xpGain", 2.00)),

  // ── Set 2: elemental + hybrid (8) ──
  keystone("ks_thunder",    "+50% Lightning Dmg",     "Thunder God",        pct("lightningDmg", 0.50)),
  keystone("ks_frost",      "+50% Cold Dmg",          "Frost Emperor",      pct("coldDmg", 0.50)),
  keystone("ks_ghost",      "+80% Crit Chance",       "Ghost Step",         pct("critChance", 0.80)),
  keystone("ks_warlord",    "+40% DPS",               "Warlord",            pct("dps", 0.40)),
  keystone("ks_bloodking",  "+75% HP, +15% Dmg",      "Blood King",         pct("hp", 0.75), pct("damage", 0.15)),
  keystone("ks_executioner", "Crits deal 2x",         "Executioner",        pct("critMulti", 0.80)),
  keystone("ks_ironwill",   "+120% HP, no crit",      "Iron Will",          pct("hp", 1.20), pct("critChance", -0.90)),
  keystone("ks_fortune2",   "+80% Gold, +40% XP",     "Golden Age",         pct("goldFind", 0.80), pct("xpGain", 0.40)),

  // ── Set 3: dual-stat (8) ──
  keystone("ks_pyro",       "+40% Fire, +20% DPS",    "Pyromancer",         pct("fireDmg", 0.40), pct("dps", 0.20)),
  keystone("ks_blizzard",   "+40% Cold, +30% HP",     "Blizzard Heart",     pct("coldDmg", 0.40), pct("hp", 0.30)),
  keystone("ks_tempest",    "+40% Lghtng, +25% Crit", "Tempest Lord",       pct("lightningDmg", 0.40), pct("critChance", 0.25)),
  keystone("ks_titan",      "+60% HP, +20% DPS",      "Titan Grip",         pct("hp", 0.60), pct("dps", 0.20)),
  keystone("ks_shadow",     "+50% Crit Dmg, +30% Dmg","Shadow Master",      pct("critMulti", 0.50), pct("damage", 0.30)),
  keystone("ks_phoenix",    "+50% Fire, +50% HP",     "Phoenix Rising",     pct("fireDmg", 0.50), pct("hp", 0.50)),
  keystone("ks_scholar",    "2x XP, +30% Gold",       "Grand Scholar",      pct("xpGain", 1.00), pct("goldFind", 0.30)),
  keystone("ks_destroyer",  "+70% Damage",            "World Destroyer",    pct("damage", 0.70)),

  // ── Set 4: advanced keystones (8) ──
  keystone("ks_avalanche",  "+45% Cold, +15% Dmg",    "Avalanche",          pct("coldDmg", 0.45), pct("damage", 0.15)),
  keystone("ks_voltage",    "+45% Lightning, +15% DPS","Voltage Surge",      pct("lightningDmg", 0.45), pct("dps", 0.15)),
  keystone("ks_voidwalker", "+60% Dmg, -30% HP",      "Void Walker",        pct("damage", 0.60), pct("hp", -0.30)),
  keystone("ks_oathkeeper", "+80% HP, +10% Gold",     "Oathkeeper",         pct("hp", 0.80), pct("goldFind", 0.10)),
  keystone("ks_sunfire",    "+35% Fire, +35% Crit",   "Sunfire",            pct("fireDmg", 0.35), pct("critChance", 0.35)),
  keystone("ks_nightblade", "+60% Crit Dmg, +20% DPS","Nightblade",         pct("critMulti", 0.60), pct("dps", 0.20)),
  keystone("ks_sage",       "2.5x XP",                "Sage of Ages",       pct("xpGain", 1.50)),
  keystone("ks_dragon",     "+40% Fire, +20% Lghtng", "Dragon Breath",      pct("fireDmg", 0.40), pct("lightningDmg", 0.20)),

  // ── Set 5: offensive keystones (8) ──
  keystone("ks_reaper",     "+55% Dmg, +25% Crit",    "Reaper",             pct("damage", 0.55), pct("critChance", 0.25)),
  keystone("ks_glacial",    "+55% Cold, +20% Crit",   "Glacial Core",       pct("coldDmg", 0.55), pct("critChance", 0.20)),
  keystone("ks_mjolnir",    "+55% Lghtng, +25% Dmg",  "Mjolnir",            pct("lightningDmg", 0.55), pct("damage", 0.25)),
  keystone("ks_golem",      "+90% HP",                "Stone Golem",        pct("hp", 0.90)),
  keystone("ks_plunder",    "+90% Gold",              "Grand Plunder",      pct("goldFind", 0.90)),
  keystone("ks_frenzy",     "+35% DPS, +15% Dmg",     "Blood Frenzy",       pct("dps", 0.35), pct("damage", 0.15)),
  keystone("ks_nova",       "+30% Fire, +30% Cold",    "Elemental Nova",     pct("fireDmg", 0.30), pct("coldDmg", 0.30)),
  keystone("ks_dervish",    "+45% DPS, -20% HP",       "Whirling Dervish",   pct("dps", 0.45), pct("hp", -0.20)),

  // ── Set 6: defensive/utility keystones (8) ──
  keystone("ks_bulwark",    "+70% HP, +10% DPS",       "Living Bulwark",     pct("hp", 0.70), pct("dps", 0.10)),
  keystone("ks_alchemist",  "+50% Gold, +50% XP",      "Grand Alchemist",    pct("goldFind", 0.50), pct("xpGain", 0.50)),
  keystone("ks_predator",   "+70% Crit Dmg",           "Apex Predator",      pct("critMulti", 0.70)),
  keystone("ks_wardstone",  "+100% HP, +10% Dodge",    "Ancient Wardstone",  pct("hp", 1.00), pct("dodge", 0.10)),
  keystone("ks_cinder",     "+50% Fire, +15% Crit",    "Cinder Lord",        pct("fireDmg", 0.50), pct("critChance", 0.15)),
  keystone("ks_permafrost", "+50% Cold, +20% DPS",     "Permafrost",         pct("coldDmg", 0.50), pct("dps", 0.20)),
  keystone("ks_arclight",   "+50% Lghtng, +20% HP",    "Arclight Sentinel",  pct("lightningDmg", 0.50), pct("hp", 0.20)),
  keystone("ks_zenith",     "+35% Dmg, +20% Crit, +15% HP", "Zenith",       pct("damage", 0.35), pct("critChance", 0.20), pct("hp", 0.15)),
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

// ── Class-specific skill pools (16 per class) ────────────

export const CLASS_SKILLS: Record<string, NodeDef[]> = {

  /** Samurai - lightning + physical, crit-focused swift blade */
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
    classSkill("sam_versatile", "+3 Versatile Spell Lv.",        "Balanced Blade",  flat("versatileSpellLevel", 3)),
  ],

  /** Warrior - fire + physical, tanky HP fortress */
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
    classSkill("war_martial",   "+3 Weapon Spell Lv.",             "Weapon Mastery",  flat("weaponSpellLevel", 3)),
  ],

  /** Mage - fire/lightning/cold master, pure elemental diversity */
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
    classSkill("mag_arcpow",    "+3 Arcane Spell Lv.",              "Arcane Power",    flat("arcaneSpellLevel", 3)),
  ],

  /** Archer - cold + physical, crit/dodge ranged precision */
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
    classSkill("sc_mag_0", "+3% DPS",               "Arcane Flow",    pct("dps", 0.03)),
    classSkill("sc_mag_1", "+8% HP",                 "Mana Well",      pct("hp", 0.08)),
    classSkill("sc_mag_2", "+5% Fire Dmg",           "Spark",          pct("fireDmg", 0.05)),
    classSkill("sc_mag_3", "+5% Fire Dmg",           "Ember Path",     pct("fireDmg", 0.05)),
    classSkill("sc_mag_4", "+5% Cold Dmg",           "Chill Touch",    pct("coldDmg", 0.05)),
    classSkill("sc_mag_5", "+8% Fire, +5% Crit",    "Ignition",       pct("fireDmg", 0.08), pct("critChance", 0.05)),
    classSkill("sc_mag_6", "+6% CritDmg, +5% Fire", "Combustion",     pct("critMulti", 0.06), pct("fireDmg", 0.05)),
    classSkill("sc_mag_7", "+4% DPS",               "Ether Link",     pct("dps", 0.04)),
  ],

  /** Samurai connectors - physical/crit (left) + lightning (right) */
  samurai: [
    classSkill("sc_sam_0", "+3% Damage",              "Blade Focus",    pct("damage", 0.03)),
    classSkill("sc_sam_1", "+5% Damage",              "Sharp Edge",     pct("damage", 0.05)),
    classSkill("sc_sam_2", "+5% Crit Chance",         "Keen Eye",       pct("critChance", 0.05)),
    classSkill("sc_sam_3", "+5% Lightning Dmg",       "Storm Path",     pct("lightningDmg", 0.05)),
    classSkill("sc_sam_4", "+5% Lightning Dmg",       "Charged Blade",  pct("lightningDmg", 0.05)),
    classSkill("sc_sam_5", "+6% CritDmg, +5% Crit",  "Lethal Point",   pct("critMulti", 0.06), pct("critChance", 0.05)),
    classSkill("sc_sam_6", "+4% DPS",                 "Swift Wind",     pct("dps", 0.04)),
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
    classSkill("sc_arc_6", "+4% DPS",                 "Quick Draw",     pct("dps", 0.04)),
    classSkill("sc_arc_7", "+5% Lightning Dmg",       "Charged Arrow",  pct("lightningDmg", 0.05)),
  ],
};

// ── Bonus aggregation utility ─────────────────────────────

/**
 * Sum all stat bonuses from allocated skill tree nodes.
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

  for (const nodeId of allocated) {
    const node = nodes[nodeId];
    if (!node || node.type === "start" || node.type === "activeSkill") continue;

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
