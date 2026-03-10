/**
 * Equipment System - definitions, stat pools, tier ranges, rolling logic.
 *
 * Single source of truth for FE and BE.
 * All numeric ranges come from bot/docs/equipment/*.md.
 * Each stat has a full description (RU).
 */

// ── Types ────────────────────────────────────────────────

export type EquipmentSlotId =
  | 'one_hand' | 'two_hand'
  | 'helmet' | 'amulet' | 'armor' | 'ring'
  | 'gloves' | 'belt' | 'boots';

export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type StatId =
  | 'flat_phys_dmg' | 'pct_phys_dmg'
  | 'flat_fire_dmg' | 'flat_cold_dmg' | 'flat_lightning_dmg'
  | 'crit_chance' | 'crit_multiplier'
  | 'flat_hp' | 'pct_hp'
  | 'flat_armor' | 'pct_armor'
  | 'flat_evasion' | 'pct_evasion'
  | 'flat_energy_shield' | 'pct_energy_shield'
  | 'block_chance'
  | 'fire_res' | 'cold_res' | 'lightning_res' | 'phys_res'
  | 'gold_find' | 'xp_bonus'
  | 'life_regen' | 'life_on_hit'
  | 'passive_dps_bonus'
  | 'weapon_spell_level' | 'arcane_spell_level' | 'versatile_spell_level'
  | 'skill_level';  // deprecated → versatile_spell_level (backward compat)

// ── Stat Definitions (with descriptions) ─────────────────

export interface StatDef {
  id: StatId;
  name: string;
  /** Единица отображения: '+N', '+N%', '+N/s' */
  unit: string;
  /** Полное описание стата (RU) */
  description: string;
  /** Категория: offensive / defensive / utility */
  category: 'offensive' | 'defensive' | 'utility';
}

export const STAT_DEFS: Record<StatId, StatDef> = {
  // ── Offensive ──
  flat_phys_dmg: {
    id: 'flat_phys_dmg',
    name: 'Flat Physical Damage',
    unit: '+N',
    description: 'Добавляет плоский физический урон к каждой атаке. Суммируется с базовым уроном оружия перед процентными модификаторами.',
    category: 'offensive',
  },
  pct_phys_dmg: {
    id: 'pct_phys_dmg',
    name: '% Physical Damage',
    unit: '+N%',
    description: 'Увеличивает весь физический урон на указанный процент. Применяется после сложения базового и плоского урона.',
    category: 'offensive',
  },
  flat_fire_dmg: {
    id: 'flat_fire_dmg',
    name: 'Flat Fire Damage',
    unit: '+N',
    description: 'Добавляет плоский урон огнём к каждой атаке. Проходит через fire resistance врага.',
    category: 'offensive',
  },
  flat_cold_dmg: {
    id: 'flat_cold_dmg',
    name: 'Flat Cold Damage',
    unit: '+N',
    description: 'Добавляет плоский урон холодом к каждой атаке. Проходит через cold resistance врага.',
    category: 'offensive',
  },
  flat_lightning_dmg: {
    id: 'flat_lightning_dmg',
    name: 'Flat Lightning Damage',
    unit: '+N',
    description: 'Добавляет плоский урон молнией к каждой атаке. Имеет самый широкий разброс значений среди элементов.',
    category: 'offensive',
  },
  crit_chance: {
    id: 'crit_chance',
    name: 'Critical Strike Chance',
    unit: '+N%',
    description: 'Увеличивает шанс нанести критический удар. Базовый крит шанс - 5%. Критический удар наносит урон × crit_multiplier.',
    category: 'offensive',
  },
  crit_multiplier: {
    id: 'crit_multiplier',
    name: 'Critical Strike Multiplier',
    unit: '+N%',
    description: 'Увеличивает множитель критического урона. Базовый множитель - 150%. Чем выше - тем разрушительнее критические удары.',
    category: 'offensive',
  },
  // ── Defensive ──
  flat_hp: {
    id: 'flat_hp',
    name: 'Flat Life',
    unit: '+N',
    description: 'Добавляет плоское количество очков здоровья к максимуму HP. Основной оборонительный стат - увеличивает запас прочности.',
    category: 'defensive',
  },
  pct_hp: {
    id: 'pct_hp',
    name: '% Increased Life',
    unit: '+N%',
    description: 'Увеличивает максимальное здоровье на процент. Применяется ко всему пулу HP (базовый + плоский).',
    category: 'defensive',
  },
  flat_armor: {
    id: 'flat_armor',
    name: 'Flat Armour',
    unit: '+N',
    description: 'Добавляет плоскую броню. Броня снижает получаемый физический урон по формуле: reduction = armor / (armor + 10 × enemyDmg).',
    category: 'defensive',
  },
  pct_armor: {
    id: 'pct_armor',
    name: '% Increased Armour',
    unit: '+N%',
    description: 'Увеличивает общую броню на процент. Применяется к сумме базовой и плоской брони со всей экипировки.',
    category: 'defensive',
  },
  flat_evasion: {
    id: 'flat_evasion',
    name: 'Flat Evasion',
    unit: '+N',
    description: 'Добавляет плоское уклонение. Уклонение даёт шанс полностью избежать удара: dodge% = evasion / (evasion + 200).',
    category: 'defensive',
  },
  pct_evasion: {
    id: 'pct_evasion',
    name: '% Increased Evasion',
    unit: '+N%',
    description: 'Увеличивает общее уклонение на процент. Применяется к сумме базового и плоского уклонения.',
    category: 'defensive',
  },
  flat_energy_shield: {
    id: 'flat_energy_shield',
    name: 'Flat Energy Shield',
    unit: '+N',
    description: 'Добавляет плоский энергетический щит. ES поглощает урон раньше HP и восстанавливается через несколько секунд без урона.',
    category: 'defensive',
  },
  pct_energy_shield: {
    id: 'pct_energy_shield',
    name: '% Increased Energy Shield',
    unit: '+N%',
    description: 'Увеличивает общий энергетический щит на процент. Применяется ко всему пулу ES.',
    category: 'defensive',
  },
  block_chance: {
    id: 'block_chance',
    name: 'Block Chance',
    unit: '+N%',
    description: 'Шанс заблокировать входящий физический удар. Блок полностью отменяет урон. Доступен только на одноручном оружии и щитах.',
    category: 'defensive',
  },
  fire_res: {
    id: 'fire_res',
    name: 'Fire Resistance',
    unit: '+N%',
    description: 'Снижает получаемый урон от огня на указанный процент. Максимальный капитан - 75%. Критически важен против Oni и Dragon.',
    category: 'defensive',
  },
  cold_res: {
    id: 'cold_res',
    name: 'Cold Resistance',
    unit: '+N%',
    description: 'Снижает получаемый урон от холода на указанный процент. Максимальный капитан - 75%. Важен против Forest Spirit.',
    category: 'defensive',
  },
  lightning_res: {
    id: 'lightning_res',
    name: 'Lightning Resistance',
    unit: '+N%',
    description: 'Снижает получаемый урон от молнии на указанный процент. Максимальный капитан - 75%. Критичен против Ronin и Tengu.',
    category: 'defensive',
  },
  phys_res: {
    id: 'phys_res',
    name: 'Physical Resistance',
    unit: '+N%',
    description: 'Снижает получаемый физический урон на процент (поверх брони). Максимальный капитан - 75%. Работает независимо от Armour.',
    category: 'defensive',
  },
  // ── Utility ──
  gold_find: {
    id: 'gold_find',
    name: 'Gold Find',
    unit: '+N%',
    description: 'Увеличивает количество золота, получаемого за убийство монстров. Суммируется со всей экипировки мультипликативно.',
    category: 'utility',
  },
  xp_bonus: {
    id: 'xp_bonus',
    name: 'Experience Bonus',
    unit: '+N%',
    description: 'Увеличивает получаемый опыт за убийство монстров. Ускоряет прокачку уровня персонажа.',
    category: 'utility',
  },
  life_regen: {
    id: 'life_regen',
    name: 'Life Regeneration',
    unit: '+N/s',
    description: 'Пассивное восстановление здоровья в секунду. Работает постоянно, даже в бою. Суммируется со всей экипировки.',
    category: 'utility',
  },
  life_on_hit: {
    id: 'life_on_hit',
    name: 'Life on Hit',
    unit: '+N',
    description: 'Восстанавливает указанное количество HP за каждый нанесённый удар (тап). Мгновенное лечение - идеально для активного геймплея.',
    category: 'utility',
  },
  passive_dps_bonus: {
    id: 'passive_dps_bonus',
    name: 'Passive DPS Bonus',
    unit: '+N%',
    description: 'Увеличивает пассивный урон (автоатаку). Бонус применяется к тикам урона, которые наносятся автоматически без тапов.',
    category: 'utility',
  },
  weapon_spell_level: {
    id: 'weapon_spell_level',
    name: 'Weapon Spell Level',
    unit: '+N',
    description: 'Добавляет уровни к Weapon скилам (скейлятся от урона оружия). Каждый уровень ×1.07 к урону. Также усиливает базовую атаку Hit.',
    category: 'offensive',
  },
  arcane_spell_level: {
    id: 'arcane_spell_level',
    name: 'Arcane Spell Level',
    unit: '+N',
    description: 'Добавляет уровни к Arcane скилам (имеют свой базовый урон). Каждый уровень ×1.07 к урону.',
    category: 'offensive',
  },
  versatile_spell_level: {
    id: 'versatile_spell_level',
    name: 'Versatile Spell Level',
    unit: '+N',
    description: 'Добавляет уровни ко ВСЕМ скилам (Weapon + Arcane), но в 1.5× слабее: 3 очка = 2 эффективных уровня.',
    category: 'offensive',
  },
  skill_level: {
    id: 'skill_level',
    name: 'Skill Level',
    unit: '+N',
    description: '[Deprecated → Versatile Spell Level] Добавляет уровни ко всем скилам.',
    category: 'offensive',
  },
};

// ── Tier system ──────────────────────────────────────────

/** Tier index: 0=T5, 1=T4, 2=T3, 3=T2, 4=T1 */
export const TIER_ILVL_RANGES: [number, number][] = [
  [1, 19],   // T5 - idx 0
  [20, 39],  // T4 - idx 1
  [40, 59],  // T3 - idx 2
  [60, 79],  // T2 - idx 3
  [80, 100], // T1 - idx 4
];

export const TIER_NAMES = ['T5', 'T4', 'T3', 'T2', 'T1'] as const;

export function getTierIndex(iLvl: number): number {
  if (iLvl >= 80) return 4;
  if (iLvl >= 60) return 3;
  if (iLvl >= 40) return 2;
  if (iLvl >= 20) return 1;
  return 0;
}

export function getRequiredLevel(iLvl: number): number {
  return Math.floor(iLvl * 0.75);
}

// ── Rarity config ────────────────────────────────────────

export interface EquipmentRarityDef {
  id: EquipmentRarity;
  label: string;
  color: string;
  /** [minStats, maxStats] - items get 2-4 stats */
  statCount: [number, number];
  /** Drop weight (out of 100) */
  dropWeight: number;
}

export const EQUIPMENT_RARITIES: Record<EquipmentRarity, EquipmentRarityDef> = {
  common:    { id: 'common',    label: 'Common',    color: '#9d9d9d', statCount: [2, 2], dropWeight: 60 },
  rare:      { id: 'rare',      label: 'Rare',      color: '#4488ff', statCount: [2, 3], dropWeight: 25 },
  epic:      { id: 'epic',      label: 'Epic',      color: '#a335ee', statCount: [3, 4], dropWeight: 12 },
  legendary: { id: 'legendary', label: 'Legendary', color: '#ff8000', statCount: [4, 4], dropWeight: 3  },
};

// ── Slot definitions ─────────────────────────────────────

export interface SlotDef {
  id: EquipmentSlotId;
  name: string;
  description: string;
}

export const SLOT_DEFS: Record<EquipmentSlotId, SlotDef> = {
  one_hand: { id: 'one_hand', name: 'One-Hand Weapon', description: 'Одноручное оружие - мечи, топоры, кинжалы, жезлы, булавы. Позволяет использовать щит во второй руке.' },
  two_hand: { id: 'two_hand', name: 'Two-Hand Weapon', description: 'Двуручное оружие - луки, посохи, двуручные мечи. Статы ~1.5× выше одноручного, но нельзя носить щит.' },
  helmet:   { id: 'helmet',   name: 'Helmet',          description: 'Защитная экипировка для головы. Даёт HP, броню, уклонение, энергощит и бонус к опыту.' },
  amulet:   { id: 'amulet',   name: 'Amulet',          description: 'Универсальный слот - даёт как атакующие, так и защитные статы. Единственный слот с passive_dps_bonus.' },
  armor:    { id: 'armor',    name: 'Body Armour',     description: 'Основной защитный слот. Максимальные значения HP, брони, уклонения и энергощита в игре.' },
  ring:     { id: 'ring',     name: 'Ring',            description: 'Универсальные аксессуары (2 слота). Крит, элементальный урон, резисты и gold find.' },
  gloves:   { id: 'gloves',   name: 'Gloves',          description: 'Гибридный слот. Даёт оборонительные статы + крит и life on hit. Микс атаки и защиты.' },
  belt:     { id: 'belt',     name: 'Belt',            description: 'Утилитарно-защитный слот. Основной источник HP и gold find. Также даёт броню и life regen.' },
  boots:    { id: 'boots',    name: 'Boots',           description: 'Оборонительный слот. HP, броня, уклонение, ES и элементальные резисты.' },
};

// ── Subtypes ─────────────────────────────────────────────

export interface SubtypeDef {
  code: string;
  name: string;
  slot: EquipmentSlotId;
  description: string;
  /** Implicit stat (base stat of the subtype), if any */
  implicit?: { stat: StatId; tierRanges: [number, number][] };
}

export const SUBTYPES: SubtypeDef[] = [
  // One-Hand
  { code: 'oh_sword',  name: 'Sword',  slot: 'one_hand', description: 'Баланс урона и крита' },
  { code: 'oh_axe',    name: 'Axe',    slot: 'one_hand', description: 'Высокий физ. урон' },
  { code: 'oh_dagger', name: 'Dagger', slot: 'one_hand', description: 'Высокий крит' },
  { code: 'oh_wand',   name: 'Wand',   slot: 'one_hand', description: 'Элементальный урон' },
  { code: 'oh_mace',   name: 'Mace',   slot: 'one_hand', description: 'Высокий урон, низкая скорость' },
  // Two-Hand
  { code: 'th_sword',  name: 'Greatsword', slot: 'two_hand', description: 'Высокий физ. урон' },
  { code: 'th_axe',    name: 'Greataxe',   slot: 'two_hand', description: 'Максимальный физ. урон' },
  { code: 'th_bow',    name: 'Bow',        slot: 'two_hand', description: 'Дальний бой, крит' },
  { code: 'th_staff',  name: 'Staff',      slot: 'two_hand', description: 'Элементальный урон' },
  { code: 'th_mace',   name: 'Greatmace',  slot: 'two_hand', description: 'Огромный урон, медленный' },
  // Helmet
  { code: 'helm_heavy',   name: 'Heavy Helm', slot: 'helmet', description: 'Броня, HP' },
  { code: 'helm_light',   name: 'Light Helm', slot: 'helmet', description: 'Уклонение, энергощит' },
  { code: 'helm_circlet', name: 'Circlet',    slot: 'helmet', description: 'Энергощит, бонус опыта' },
  // Amulet
  { code: 'amu_pendant',  name: 'Pendant',  slot: 'amulet', description: 'Баланс атаки и защиты' },
  { code: 'amu_talisman', name: 'Talisman', slot: 'amulet', description: 'Элементальный фокус' },
  { code: 'amu_locket',   name: 'Locket',   slot: 'amulet', description: 'Защитный фокус' },
  // Armor
  { code: 'arm_plate',   name: 'Plate',   slot: 'armor', description: 'Максимальная броня' },
  { code: 'arm_leather', name: 'Leather', slot: 'armor', description: 'Уклонение' },
  { code: 'arm_robe',    name: 'Robe',    slot: 'armor', description: 'Энергощит' },
  { code: 'arm_chain',   name: 'Chain',   slot: 'armor', description: 'Броня + Уклонение (гибрид)' },
  // Ring
  { code: 'ring_ruby',     name: 'Ruby Ring',     slot: 'ring', description: 'Implicit: +flat_hp',            implicit: { stat: 'flat_hp',            tierRanges: [[5,12],[5,22],[5,35],[5,50],[5,70]] } },
  { code: 'ring_sapphire', name: 'Sapphire Ring', slot: 'ring', description: 'Implicit: +flat_cold_dmg',      implicit: { stat: 'flat_cold_dmg',      tierRanges: [[1,3],[1,6],[1,10],[1,16],[1,24]] } },
  { code: 'ring_topaz',    name: 'Topaz Ring',    slot: 'ring', description: 'Implicit: +flat_lightning_dmg',  implicit: { stat: 'flat_lightning_dmg', tierRanges: [[1,4],[1,8],[1,14],[1,22],[1,32]] } },
  { code: 'ring_gold',     name: 'Gold Ring',     slot: 'ring', description: 'Implicit: +gold_find',          implicit: { stat: 'gold_find',          tierRanges: [[3,8],[3,14],[3,22],[3,32],[3,45]] } },
  { code: 'ring_iron',     name: 'Iron Ring',     slot: 'ring', description: 'Implicit: +flat_phys_dmg',      implicit: { stat: 'flat_phys_dmg',      tierRanges: [[1,2],[1,5],[1,9],[1,14],[1,20]] } },
  // Gloves
  { code: 'glov_gauntlet', name: 'Gauntlets', slot: 'gloves', description: 'Броня, атака' },
  { code: 'glov_bracer',   name: 'Bracers',   slot: 'gloves', description: 'Уклонение, крит' },
  { code: 'glov_wrap',     name: 'Wraps',     slot: 'gloves', description: 'Энергощит, крит' },
  // Belt
  { code: 'belt_leather', name: 'Leather Belt', slot: 'belt', description: 'Implicit: +flat_hp',            implicit: { stat: 'flat_hp',            tierRanges: [[5,15],[5,28],[5,45],[5,65],[5,90]] } },
  { code: 'belt_chain',   name: 'Chain Belt',   slot: 'belt', description: 'Implicit: +flat_energy_shield', implicit: { stat: 'flat_energy_shield', tierRanges: [[2,6],[2,12],[2,20],[2,30],[2,42]] } },
  { code: 'belt_heavy',   name: 'Heavy Belt',   slot: 'belt', description: 'Implicit: +flat_armor',         implicit: { stat: 'flat_armor',         tierRanges: [[3,12],[3,25],[3,42],[3,62],[3,85]] } },
  { code: 'belt_cloth',   name: 'Cloth Belt',   slot: 'belt', description: 'Implicit: +gold_find',          implicit: { stat: 'gold_find',          tierRanges: [[3,8],[3,15],[3,25],[3,38],[3,55]] } },
  // Boots
  { code: 'boot_plate',   name: 'Plate Boots',   slot: 'boots', description: 'Броня, HP' },
  { code: 'boot_leather', name: 'Leather Boots', slot: 'boots', description: 'Уклонение' },
  { code: 'boot_silk',    name: 'Silk Shoes',    slot: 'boots', description: 'Энергощит' },
  { code: 'boot_chain',   name: 'Chain Boots',   slot: 'boots', description: 'Броня + Уклонение (гибрид)' },
];

export function getSubtypesForSlot(slot: EquipmentSlotId): SubtypeDef[] {
  return SUBTYPES.filter(s => s.slot === slot);
}

// ── Base damage / defense per tier (implicit) ────────────

/** [T5, T4, T3, T2, T1] - each [min, max] */
export const BASE_WEAPON_DAMAGE: Record<'one_hand' | 'two_hand', [number, number][]> = {
  one_hand: [[3,8], [7,18], [15,35], [28,55], [45,90]],
  two_hand: [[5,12], [10,27], [22,52], [42,82], [68,135]],
};

/** Base defenses per slot for each defense type. Subtypes pick their primary. */
export const BASE_DEFENSES: Record<string, { armor: [number,number][]; evasion: [number,number][]; es: [number,number][] }> = {
  helmet: {
    armor:   [[5,12],  [12,28], [25,50],  [45,80],  [70,120]],
    evasion: [[3,8],   [8,18],  [16,35],  [30,55],  [48,85]],
    es:      [[2,6],   [5,14],  [10,25],  [20,42],  [35,65]],
  },
  armor: {
    armor:   [[10,25], [22,55], [48,95],  [85,155], [135,230]],
    evasion: [[6,16],  [14,36], [30,65],  [55,105], [90,165]],
    es:      [[4,12],  [10,28], [22,50],  [40,82],  [65,125]],
  },
  gloves: {
    armor:   [[3,8],   [8,18],  [16,32],  [28,52],  [45,80]],
    evasion: [[2,6],   [5,12],  [10,22],  [18,36],  [30,55]],
    es:      [[1,4],   [3,9],   [7,16],   [12,28],  [22,42]],
  },
  boots: {
    armor:   [[3,8],   [8,18],  [16,32],  [28,52],  [45,80]],
    evasion: [[2,6],   [5,12],  [10,22],  [18,36],  [30,55]],
    es:      [[1,4],   [3,9],   [7,16],   [12,28],  [22,42]],
  },
};

// ── Stat pools per slot ──────────────────────────────────

export const SLOT_STAT_POOLS: Record<EquipmentSlotId, StatId[]> = {
  one_hand: ['flat_phys_dmg', 'pct_phys_dmg', 'flat_fire_dmg', 'flat_cold_dmg', 'flat_lightning_dmg', 'crit_chance', 'crit_multiplier', 'block_chance', 'life_on_hit', 'weapon_spell_level', 'arcane_spell_level', 'versatile_spell_level'],
  two_hand: ['flat_phys_dmg', 'pct_phys_dmg', 'flat_fire_dmg', 'flat_cold_dmg', 'flat_lightning_dmg', 'crit_chance', 'crit_multiplier', 'life_on_hit', 'weapon_spell_level', 'arcane_spell_level', 'versatile_spell_level'],
  helmet:   ['flat_hp', 'pct_hp', 'flat_armor', 'pct_armor', 'flat_evasion', 'pct_evasion', 'flat_energy_shield', 'pct_energy_shield', 'xp_bonus', 'fire_res', 'cold_res', 'lightning_res', 'phys_res'],
  amulet:   ['pct_phys_dmg', 'flat_fire_dmg', 'flat_cold_dmg', 'flat_lightning_dmg', 'crit_chance', 'crit_multiplier', 'flat_hp', 'pct_hp', 'gold_find', 'xp_bonus', 'life_regen', 'passive_dps_bonus', 'weapon_spell_level', 'arcane_spell_level', 'versatile_spell_level', 'fire_res', 'cold_res', 'lightning_res', 'phys_res'],
  armor:    ['flat_hp', 'pct_hp', 'flat_armor', 'pct_armor', 'flat_evasion', 'pct_evasion', 'flat_energy_shield', 'pct_energy_shield', 'life_regen', 'fire_res', 'cold_res', 'lightning_res', 'phys_res'],
  ring:     ['pct_phys_dmg', 'flat_fire_dmg', 'flat_cold_dmg', 'flat_lightning_dmg', 'crit_chance', 'crit_multiplier', 'flat_hp', 'pct_hp', 'gold_find', 'xp_bonus', 'life_regen', 'life_on_hit', 'passive_dps_bonus', 'fire_res', 'cold_res', 'lightning_res', 'phys_res'],
  gloves:   ['pct_phys_dmg', 'crit_chance', 'flat_armor', 'flat_evasion', 'flat_energy_shield', 'life_on_hit'],
  belt:     ['flat_hp', 'pct_hp', 'flat_armor', 'gold_find', 'life_regen', 'fire_res', 'cold_res', 'lightning_res', 'phys_res'],
  boots:    ['flat_hp', 'flat_armor', 'flat_evasion', 'flat_energy_shield', 'fire_res', 'cold_res', 'lightning_res'],
};

// ── Stat ranges: [T5, T4, T3, T2, T1] - each [min, max] ─

type TierRanges = [[number,number],[number,number],[number,number],[number,number],[number,number]];

/**
 * All stat ranges by slot → stat.
 * Values come directly from bot/docs/equipment/*.md.
 */
export const STAT_RANGES: Record<EquipmentSlotId, Partial<Record<StatId, TierRanges>>> = {

  // ═══════ ONE-HAND ═══════
  one_hand: {
    flat_phys_dmg:     [[1,5],   [1,12],  [1,25],  [1,45],  [1,75]],
    pct_phys_dmg:      [[5,20],  [5,40],  [5,70],  [5,110], [5,160]],
    flat_fire_dmg:     [[1,4],   [1,10],  [1,20],  [1,38],  [1,60]],
    flat_cold_dmg:     [[1,4],   [1,10],  [1,20],  [1,38],  [1,60]],
    flat_lightning_dmg:[[1,6],   [1,15],  [1,30],  [1,50],  [1,80]],
    crit_chance:       [[0.5,2], [0.5,4], [0.5,6], [0.5,9], [0.5,12]],
    crit_multiplier:   [[5,15],  [5,25],  [5,40],  [5,60],  [5,85]],
    block_chance:      [[1,3],   [1,5],   [1,8],   [1,12],  [1,15]],
    life_on_hit:       [[1,3],   [1,7],   [1,14],  [1,22],  [1,35]],
    weapon_spell_level:    [[1,1],   [1,2],   [1,3],   [2,5],   [3,7]],
    arcane_spell_level:    [[1,1],   [1,2],   [1,3],   [2,5],   [3,7]],
    versatile_spell_level: [[1,2],   [1,3],   [2,5],   [3,7],   [4,10]],
  },

  // ═══════ TWO-HAND ═══════
  two_hand: {
    flat_phys_dmg:     [[2,8],   [2,18],  [2,38],  [2,68],  [2,112]],
    pct_phys_dmg:      [[8,30],  [8,60],  [8,105], [8,165], [8,240]],
    flat_fire_dmg:     [[1,6],   [1,15],  [1,30],  [1,57],  [1,90]],
    flat_cold_dmg:     [[1,6],   [1,15],  [1,30],  [1,57],  [1,90]],
    flat_lightning_dmg:[[1,9],   [1,22],  [1,45],  [1,75],  [1,120]],
    crit_chance:       [[0.5,2], [0.5,4], [0.5,6], [0.5,9], [0.5,12]],
    crit_multiplier:   [[8,22],  [8,38],  [8,60],  [8,90],  [8,128]],
    life_on_hit:       [[1,5],   [1,10],  [1,21],  [1,33],  [1,52]],
    weapon_spell_level:    [[1,2],   [1,3],   [2,5],   [3,8],   [4,10]],
    arcane_spell_level:    [[1,2],   [1,3],   [2,5],   [3,8],   [4,10]],
    versatile_spell_level: [[1,3],   [2,5],   [3,7],   [4,10],  [5,14]],
  },

  // ═══════ HELMET ═══════
  helmet: {
    flat_hp:           [[5,20],  [5,40],  [5,65],  [5,95],  [5,130]],
    pct_hp:            [[2,6],   [2,10],  [2,15],  [2,20],  [2,28]],
    flat_armor:        [[3,15],  [3,35],  [3,60],  [3,95],  [3,140]],
    pct_armor:         [[3,10],  [3,20],  [3,35],  [3,55],  [3,80]],
    flat_evasion:      [[3,12],  [3,28],  [3,50],  [3,78],  [3,115]],
    pct_evasion:       [[3,10],  [3,20],  [3,35],  [3,55],  [3,80]],
    flat_energy_shield:[[2,8],   [2,18],  [2,32],  [2,50],  [2,75]],
    pct_energy_shield: [[3,10],  [3,22],  [3,40],  [3,60],  [3,85]],
    xp_bonus:          [[1,3],   [1,5],   [1,8],   [1,12],  [1,16]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    phys_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },

  // ═══════ AMULET ═══════
  amulet: {
    pct_phys_dmg:      [[3,12],  [3,25],  [3,45],  [3,70],  [3,100]],
    flat_fire_dmg:     [[1,3],   [1,8],   [1,16],  [1,28],  [1,45]],
    flat_cold_dmg:     [[1,3],   [1,8],   [1,16],  [1,28],  [1,45]],
    flat_lightning_dmg:[[1,5],   [1,12],  [1,24],  [1,40],  [1,65]],
    crit_chance:       [[0.5,1.5],[0.5,3],[0.5,5], [0.5,7], [0.5,10]],
    crit_multiplier:   [[5,12],  [5,22],  [5,35],  [5,52],  [5,72]],
    flat_hp:           [[3,15],  [3,30],  [3,50],  [3,75],  [3,105]],
    pct_hp:            [[2,5],   [2,8],   [2,12],  [2,16],  [2,22]],
    gold_find:         [[3,10],  [3,20],  [3,35],  [3,55],  [3,80]],
    xp_bonus:          [[1,3],   [1,5],   [1,8],   [1,12],  [1,16]],
    life_regen:        [[0.5,2], [0.5,5], [0.5,10],[0.5,18],[0.5,28]],
    passive_dps_bonus: [[2,8],   [2,15],  [2,28],  [2,45],  [2,65]],
    weapon_spell_level:    [[1,1],   [1,1],   [1,2],   [1,3],   [2,5]],
    arcane_spell_level:    [[1,1],   [1,1],   [1,2],   [1,3],   [2,5]],
    versatile_spell_level: [[1,1],   [1,2],   [1,3],   [2,5],   [3,7]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    phys_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },

  // ═══════ ARMOR ═══════
  armor: {
    flat_hp:           [[8,30],  [8,60],  [8,100], [8,145], [8,200]],
    pct_hp:            [[3,8],   [3,14],  [3,22],  [3,30],  [3,40]],
    flat_armor:        [[5,25],  [5,55],  [5,100], [5,155], [5,220]],
    pct_armor:         [[5,15],  [5,30],  [5,50],  [5,75],  [5,110]],
    flat_evasion:      [[4,20],  [4,45],  [4,80],  [4,125], [4,180]],
    pct_evasion:       [[5,15],  [5,30],  [5,50],  [5,75],  [5,110]],
    flat_energy_shield:[[3,14],  [3,30],  [3,55],  [3,85],  [3,125]],
    pct_energy_shield: [[5,15],  [5,30],  [5,55],  [5,80],  [5,115]],
    life_regen:        [[0.5,3], [0.5,7], [0.5,14],[0.5,24],[0.5,38]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    phys_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },

  // ═══════ RING ═══════
  ring: {
    pct_phys_dmg:      [[2,8],   [2,16],  [2,28],  [2,42],  [2,60]],
    flat_fire_dmg:     [[1,3],   [1,7],   [1,14],  [1,24],  [1,38]],
    flat_cold_dmg:     [[1,3],   [1,7],   [1,14],  [1,24],  [1,38]],
    flat_lightning_dmg:[[1,5],   [1,10],  [1,20],  [1,34],  [1,52]],
    crit_chance:       [[0.3,1], [0.3,2], [0.3,3.5],[0.3,5],[0.3,7]],
    crit_multiplier:   [[3,10],  [3,18],  [3,30],  [3,45],  [3,62]],
    flat_hp:           [[3,12],  [3,25],  [3,42],  [3,62],  [3,85]],
    pct_hp:            [[1,4],   [1,6],   [1,9],   [1,12],  [1,16]],
    gold_find:         [[2,8],   [2,15],  [2,25],  [2,40],  [2,58]],
    xp_bonus:          [[1,2],   [1,4],   [1,6],   [1,9],   [1,12]],
    life_regen:        [[0.3,1.5],[0.3,4],[0.3,8], [0.3,14],[0.3,22]],
    life_on_hit:       [[1,2],   [1,5],   [1,10],  [1,16],  [1,25]],
    passive_dps_bonus: [[1,5],   [1,10],  [1,18],  [1,30],  [1,45]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    phys_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },

  // ═══════ GLOVES ═══════
  gloves: {
    pct_phys_dmg:      [[2,8],   [2,16],  [2,28],  [2,42],  [2,60]],
    crit_chance:       [[0.3,1.5],[0.3,3],[0.3,4.5],[0.3,6.5],[0.3,9]],
    flat_armor:        [[2,10],  [2,22],  [2,40],  [2,62],  [2,90]],
    flat_evasion:      [[2,8],   [2,18],  [2,32],  [2,50],  [2,72]],
    flat_energy_shield:[[1,5],   [1,12],  [1,22],  [1,35],  [1,50]],
    life_on_hit:       [[1,2],   [1,5],   [1,10],  [1,16],  [1,25]],
  },

  // ═══════ BELT ═══════
  belt: {
    flat_hp:           [[5,18],  [5,35],  [5,58],  [5,85],  [5,120]],
    pct_hp:            [[2,5],   [2,9],   [2,14],  [2,20],  [2,28]],
    flat_armor:        [[2,10],  [2,22],  [2,38],  [2,58],  [2,82]],
    gold_find:         [[3,10],  [3,18],  [3,30],  [3,48],  [3,70]],
    life_regen:        [[0.5,2], [0.5,5], [0.5,10],[0.5,18],[0.5,28]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    phys_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },

  // ═══════ BOOTS ═══════
  boots: {
    flat_hp:           [[4,16],  [4,32],  [4,55],  [4,80],  [4,112]],
    flat_armor:        [[2,10],  [2,22],  [2,40],  [2,62],  [2,90]],
    flat_evasion:      [[2,8],   [2,18],  [2,32],  [2,50],  [2,72]],
    flat_energy_shield:[[1,5],   [1,12],  [1,22],  [1,35],  [1,50]],
    fire_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    cold_res:          [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
    lightning_res:     [[3,8],   [3,14],  [3,22],  [3,32],  [3,45]],
  },
};

// ── Resistance cap (max 2 resist stats per item) ─────────

const RESIST_STATS: StatId[] = ['fire_res', 'cold_res', 'lightning_res', 'phys_res'];
const MAX_RESIST_STATS = 2;

// ── Equipment rolling ────────────────────────────────────

export interface RolledStat {
  id: StatId;
  value: number;
}

export interface RolledEquipment {
  slot: EquipmentSlotId;
  subtype: string;
  rarity: EquipmentRarity;
  itemLevel: number;
  reqLevel: number;
  baseDamage?: number;
  baseArmor?: number;
  baseEvasion?: number;
  baseES?: number;
  implicit?: RolledStat;
  stats: RolledStat[];
}

/** Roll random int in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Roll random float in [min, max]. Rounded to 1 decimal. */
function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/** Pick N random unique elements from array. */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/** Roll a stat value for given stat + tier index. */
function rollStatValue(statId: StatId, slot: EquipmentSlotId, tierIdx: number): number {
  const ranges = STAT_RANGES[slot]?.[statId];
  if (!ranges) return 0;
  const [min, max] = ranges[tierIdx];
  // Percent and float stats use float roll; flat ints use int roll
  if (min % 1 !== 0 || max % 1 !== 0) return randFloat(min, max);
  return randInt(min, max);
}

/** Roll equipment rarity using weighted drop. */
export function rollRarity(): EquipmentRarity {
  const roll = Math.random() * 100;
  if (roll < 3) return 'legendary';
  if (roll < 15) return 'epic';
  if (roll < 40) return 'rare';
  return 'common';
}

/**
 * Generate a fully rolled equipment item.
 *
 * @param slot      - target equipment slot
 * @param itemLevel - iLvl (1-100), determines tier and stat ceiling
 * @param rarity    - rarity (or omit to roll randomly)
 * @param subtype   - specific subtype code (or omit to pick random)
 */
export function rollEquipment(
  slot: EquipmentSlotId,
  itemLevel: number,
  rarity?: EquipmentRarity,
  subtype?: string,
): RolledEquipment {
  const rar = rarity ?? rollRarity();
  const tierIdx = getTierIndex(itemLevel);

  // Pick subtype
  const subtypes = getSubtypesForSlot(slot);
  const sub = subtype
    ? subtypes.find(s => s.code === subtype) ?? subtypes[0]
    : subtypes[randInt(0, subtypes.length - 1)];

  // Base damage (weapons)
  let baseDamage: number | undefined;
  if (slot === 'one_hand' || slot === 'two_hand') {
    const [dMin, dMax] = BASE_WEAPON_DAMAGE[slot][tierIdx];
    baseDamage = randInt(dMin, dMax);
  }

  // Base defenses (armor slots)
  let baseArmor: number | undefined;
  let baseEvasion: number | undefined;
  let baseES: number | undefined;
  const defSlot = BASE_DEFENSES[slot];
  if (defSlot) {
    const [aMin, aMax] = defSlot.armor[tierIdx];
    const [eMin, eMax] = defSlot.evasion[tierIdx];
    const [sMin, sMax] = defSlot.es[tierIdx];
    baseArmor = randInt(aMin, aMax);
    baseEvasion = randInt(eMin, eMax);
    baseES = randInt(sMin, sMax);
  }

  // Roll implicit (rings, belts)
  let implicit: RolledStat | undefined;
  if (sub.implicit) {
    const [iMin, iMax] = sub.implicit.tierRanges[tierIdx];
    const val = (iMin % 1 !== 0 || iMax % 1 !== 0) ? randFloat(iMin, iMax) : randInt(iMin, iMax);
    implicit = { id: sub.implicit.stat, value: val };
  }

  // Determine stat count
  const [minStats, maxStats] = EQUIPMENT_RARITIES[rar].statCount;
  const statCount = randInt(minStats, maxStats);

  // Build available pool
  const pool = [...SLOT_STAT_POOLS[slot]];

  // Pick stats, enforcing max 2 resists
  const selectedStats: StatId[] = [];
  let resistCount = 0;
  const available = [...pool];

  for (let i = 0; i < statCount && available.length > 0; i++) {
    // Filter out resists if at cap
    const filtered = resistCount >= MAX_RESIST_STATS
      ? available.filter(s => !RESIST_STATS.includes(s))
      : available;
    if (filtered.length === 0) break;

    const idx = Math.floor(Math.random() * filtered.length);
    const stat = filtered[idx];
    selectedStats.push(stat);

    // Remove from available (no duplicates)
    available.splice(available.indexOf(stat), 1);

    if (RESIST_STATS.includes(stat)) resistCount++;
  }

  // Roll values
  const stats: RolledStat[] = selectedStats.map(id => ({
    id,
    value: rollStatValue(id, slot, tierIdx),
  }));

  return {
    slot,
    subtype: sub.code,
    rarity: rar,
    itemLevel,
    reqLevel: getRequiredLevel(itemLevel),
    baseDamage,
    baseArmor,
    baseEvasion,
    baseES,
    implicit,
    stats,
  };
}

// ── UI slot ↔ equipment slot mapping ─────────────────────

/** Slot IDs used in the equipment UI grid. */
export type UISlotId =
  | 'weapon-left' | 'weapon-right'
  | 'head' | 'chest'
  | 'accessory-1' | 'accessory-2' | 'accessory-3'
  | 'gloves' | 'belt' | 'boots'
  | 'consumable-1' | 'consumable-2';

/** Which equipment slot types can go into each UI slot. */
export const UI_SLOT_ACCEPTS: Record<string, EquipmentSlotId[]> = {
  'weapon-left':  ['one_hand', 'two_hand'],
  'weapon-right': ['one_hand'],
  'head':         ['helmet'],
  'chest':        ['armor'],
  'accessory-1':  ['ring'],
  'accessory-2':  ['amulet'],
  'accessory-3':  ['ring'],
  'gloves':       ['gloves'],
  'belt':         ['belt'],
  'boots':        ['boots'],
};

/** Check if an equipment item can be placed in a given UI slot. */
export function canEquipInSlot(itemSlot: EquipmentSlotId, uiSlot: string): boolean {
  const accepts = UI_SLOT_ACCEPTS[uiSlot];
  return !!accepts && accepts.includes(itemSlot);
}

/** Get all valid UI slots for an equipment item. */
export function getValidUISlots(itemSlot: EquipmentSlotId): string[] {
  return Object.entries(UI_SLOT_ACCEPTS)
    .filter(([, accepts]) => accepts.includes(itemSlot))
    .map(([uiSlot]) => uiSlot);
}

// ── Helpers for display ──────────────────────────────────

/** Format a stat value for display. e.g. "+15" or "+8.5%" */
export function formatStat(stat: RolledStat): string {
  const def = STAT_DEFS[stat.id];
  if (!def) return `+${stat.value}`;
  const unit = def.unit;
  if (unit === '+N%') return `+${stat.value}%`;
  if (unit === '+N/s') return `+${stat.value}/s`;
  return `+${stat.value}`;
}

/** Human-readable stat label. */
export function statLabel(stat: RolledStat): string {
  const def = STAT_DEFS[stat.id];
  return `${formatStat(stat)} ${def?.name ?? stat.id}`;
}
