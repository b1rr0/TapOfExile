// ── Re-export shared types ───────────────────────────────

export type {
  ModMode,
  NodeType,
  MonsterSpawn,
  Wave,
  MapTier,
  BossKeyTierDef,
  BossMap,
  DropSettings,
  BagItemData,
  DamageElement,
  ResistableElement,
  ElementalDamage,
  ElementalResistance,
  DamageBreakdown,
} from "@shared/types";

export { ELEMENT_COLORS } from "@shared/types";

// ── Re-export class stats ────────────────────────────────

export type { ClassDef, ClassBaseStats, ClassGrowth, ClassSpecial } from "@shared/class-stats";
export { CLASS_DEFS, statsAtLevel, specialAtLevel, STAT_LABELS, RESISTANCE_LABELS, MAX_LEVEL } from "@shared/class-stats";

// ── Re-export skill tree types from shared ───────────────

export type { Emblem, SkillTreeResult } from "@shared/skill-tree";

// ── League Types ─────────────────────────────────────────

export interface LeagueInfo {
  id: string;
  name: string;
  type: "standard" | "monthly";
  status: string;
  startsAt: string;
  endsAt: string | null;
}

// ── Game State Types ─────────────────────────────────────

export interface Meta {
  lastSaveTime: number;
  totalTaps: number;
  totalKills: number;
  version: number;
}

export interface CombatState {
  currentStage: number;
  currentWave: number;
  wavesPerStage: number;
}

export interface LocationState {
  completed: string[];
  current: string | null;
  currentAct: number;
}

export interface InventoryState {
  items: unknown[];
  equipment: Record<string, unknown>;
}

export interface EndgameState {
  unlocked: boolean;
  completedBosses: string[];
  highestTierCompleted: number;
  totalMapsRun: number;
}

export interface BagItem {
  id: string;
  name: string;
  type: string;
  quality: string;
  level?: number;
  icon?: string;
  acquiredAt: number;
  tier?: number;
  locationId?: string;
  locationAct?: number;
  bossId?: string;
  bossKeyTier?: number;
  /** Potion-specific fields */
  flaskType?: string;
  maxCharges?: number;
  currentCharges?: number;
  healPercent?: number;
  /** Equipment properties (type='equipment') - stored in Item.properties JSONB */
  properties?: {
    slot?: string;
    subtype?: string;
    rarity?: string;
    itemLevel?: number;
    reqLevel?: number;
    baseDamage?: number;
    baseArmor?: number;
    baseEvasion?: number;
    baseES?: number;
    implicit?: { id: string; value: number };
    stats?: { id: string; value: number }[];
    [key: string]: unknown;
  };
}

export interface Character {
  id: string | null;
  nickname: string;
  classId: string;
  skinId: string;
  leagueId?: string;
  leagueName?: string;
  leagueType?: string;
  createdAt: number;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  dodgeChance: number;
  specialValue: number;
  resistance?: import("@shared/types").ElementalResistance;
  elementalDamage?: import("@shared/types").ElementalDamage;
  /** Equipment bonus stats (effective, with gear applied) */
  gearFireDmg?: number;
  gearColdDmg?: number;
  gearLightningDmg?: number;
  goldFind?: number;
  xpBonus?: number;
  lifeOnHit?: number;
  lifeRegen?: number;
  armor?: number;
  blockChance?: number;
  combat: CombatState;
  locations: LocationState;
  inventory: InventoryState;
  bag: BagItem[];
  endgame: EndgameState;
  allocatedNodes: number[];
  /** Active skills unlocked via skill tree */
  unlockedActiveSkills?: string[];
  /** Equipped action bar (4 slots) */
  equippedSkills?: (string | null)[];
  /** Daily bonus wins remaining (first 3 wins give x3 XP) */
  dailyBonusRemaining?: number;
}

export interface PlayerProxy {
  level: number;
  xp: number;
  xpToNext: number;
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  gold: number;
}

export interface GameData {
  gold: number;
  shards: string;
  purchasedSkins: string[];
  activeCharacterId: string | null;
  characters: Character[];
  leagues: LeagueInfo[];
  meta: Meta;
  player?: PlayerProxy;
  combat?: CombatState;
  locations?: LocationState;
  inventory?: InventoryState;
  endgame?: EndgameState;
}

// ── Monster Types ────────────────────────────────────────

export interface Rarity {
  id: string;
  label: string;
  color: string;
  hpMul: number;
  goldMul: number;
  xpMul: number;
}

export interface MonsterType {
  name: string;
  cssClass: string;
  minStage: number;
  bodyColor: string;
  eyeColor: string;
}

export interface Monster {
  name: string;
  cssClass: string;
  bodyColor: string;
  eyeColor: string;
  rarity: Rarity;
  maxHp: number;
  currentHp: number;
  goldReward: number;
  xpReward: number;
  resistance?: import("@shared/types").ElementalResistance;
  /** Skin ID for the enemy sprite (e.g. "soldier", "orc") */
  skinId?: string;
  /** Color variant subfolder (e.g. "v0", "v1_crimson") */
  skinVariant?: string;
}

// ── Location Types ───────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  description: string;
  order: number;
  act: number;
  requiredLocationId: string | null;
  waves: import("@shared/types").Wave[];
  rewards: { gold: number; xp: number };
  background?: string;
}

export interface ActDefinition {
  act: number;
  name: string;
  locations: Location[];
}

export interface ActModifier {
  icon: string;
  name: string;
  description: string;
  type: string;
  /** Effect stat key used by combat system (e.g. 'damage', 'critChance', 'dodge', 'armor', 'damageTaken') */
  stat: string;
  /** Effect target: 'self' = player buff/debuff, 'enemy' = enemy debuff */
  target: 'self' | 'enemy';
  /** Additive modifier value (e.g. 0.05 = +5%, -0.05 = -5%, flat for armor) */
  value: number;
}

// ── Character Class Types ────────────────────────────────

export interface CharacterClassDef {
  id: string;
  name: string;
  skinId: string;
  description: string;
  icon: string;
}

// ── Map Config ───────────────────────────────────────────

export interface MapConfig {
  tier?: number;
  isBoss?: boolean;
  bossId?: string;
  locationId?: string;
  locationAct?: number;
  waves: import("@shared/types").Wave[];
  tierDef?: import("@shared/types").MapTier;
  bossDef?: import("@shared/types").BossMap;
  totalGold?: number;
  totalXp?: number;
}

// ── Sprite Types ─────────────────────────────────────────

export interface AnimationConfig {
  json: string;
  fps?: number;
  loop?: boolean;
}

export interface SkinConfig {
  id: string;
  name: string;
  classId?: string;
  basePath: string;
  animations: Record<string, AnimationConfig>;
  defaultSize: { w: number; h: number };
  anchorOffsetY: number;
  scale: number;
}

// ── Scene Types ──────────────────────────────────────────

export interface SharedDeps {
  events: any;
  state: any;
  sceneManager: any;
}

export interface Scene {
  container: HTMLElement;
  events: any;
  state: any;
  sceneManager: any;
  mount(params?: unknown): void;
  unmount(): void;
}

// ── Event Types ──────────────────────────────────────────

export interface GameEventMap {
  monsterSpawned: Monster;
  damage: { damage: number; damageBreakdown?: import("@shared/types").DamageBreakdown; isCrit: boolean; monster: Monster };
  monsterDied: { monster: Monster; gold: number; xp: number };
  locationWaveProgress: { current: number; total: number };
  levelUp: { level: number };
  goldChanged: { gold: number };
  xpChanged: { xp: number; xpToNext: number };
  locationComplete: { locationId: string; rewards: { gold: number; xp: number } };
  mapComplete: { mapConfig: MapConfig; totalGold: number; totalXp: number };
  mapDrops: BagItem[];
  stateLoaded: GameData;
  characterChanged: Character;
  skinChanged: { charId: string; skinId: string };
  endgameUnlocked: undefined;
  enemyAttack: { dodged: boolean; blocked?: boolean; damage: number; breakdown: import("@shared/types").DamageBreakdown | null };
  playerHpChanged: { hp: number; maxHp: number };
  playerDied: {};
}
