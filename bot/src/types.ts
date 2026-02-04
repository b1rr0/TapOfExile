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
  totalGold: number;
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
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  passiveDps: number;
  combat: CombatState;
  locations: LocationState;
  inventory: InventoryState;
  bag: BagItem[];
  endgame: EndgameState;
  allocatedNodes: number[];
}

export interface PlayerProxy {
  level: number;
  xp: number;
  xpToNext: number;
  tapDamage: number;
  critChance: number;
  critMultiplier: number;
  passiveDps: number;
  gold: number;
}

export interface GameData {
  gold: number;
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
  passiveDamage: { damage: number; monster: Monster };
  monsterDied: { monster: Monster; gold: number; xp: number };
  locationWaveProgress: { current: number; total: number };
  levelUp: { level: number };
  goldChanged: { gold: number };
  xpChanged: { xp: number; xpToNext: number };
  locationComplete: { locationId: string; rewards: { gold: number; xp: number } };
  mapComplete: { mapConfig: MapConfig; totalGold: number; totalXp: number };
  mapDrops: BagItem[];
  waveChanged: { stage: number; wave: number };
  stageAdvanced: { stage: number };
  stateLoaded: GameData;
  characterChanged: Character;
  skinChanged: { charId: string; skinId: string };
  endgameUnlocked: undefined;
}
