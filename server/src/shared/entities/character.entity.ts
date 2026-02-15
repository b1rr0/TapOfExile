import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { ElementalDamage, ElementalResistance } from '@shared/types';
import { Player } from './player.entity';
import { PlayerLeague } from './player-league.entity';
import { EquipmentSlot } from './equipment-slot.entity';

@Entity('characters')
export class Character {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerTelegramId' })
  player: Player;

  @Column({ type: 'uuid' })
  leagueId: string;

  @Column({ type: 'uuid' })
  playerLeagueId: string;

  @ManyToOne(() => PlayerLeague, (pl) => pl.characters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerLeagueId' })
  playerLeague: PlayerLeague;

  @Column({ type: 'varchar', length: 64 })
  nickname: string;

  @Column({ type: 'varchar', length: 32 })
  classId: string;

  @Column({ type: 'varchar', length: 64 })
  skinId: string;

  @Column({ type: 'bigint' })
  createdAt: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  xp: string;

  @Column({ type: 'bigint', default: 100 })
  xpToNext: string;

  @Column({ type: 'int', default: 100 })
  hp: number;

  @Column({ type: 'int', default: 100 })
  maxHp: number;

  @Column({ type: 'int', default: 2 })
  tapDamage: number;

  @Column({ type: 'float', default: 0.05 })
  critChance: number;

  @Column({ type: 'float', default: 1.5 })
  critMultiplier: number;

  @Column({ type: 'float', default: 0 })
  dodgeChance: number;

  // Unique class ability value (block / doubleStrike / spellAmp / doubleShot)
  @Column({ type: 'float', default: 0 })
  specialValue: number;

  // Elemental damage profile (fractions summing to ~1.0)
  @Column({ type: 'jsonb', default: '{"physical":1.0}' })
  elementalDamage: ElementalDamage;

  // Resistances: physical/fire/lightning/cold (0..100 = percentage)
  @Column({ type: 'jsonb', default: '{"physical":0,"fire":0,"lightning":0,"cold":0}' })
  resistance: ElementalResistance;

  // Combat state
  @Column({ type: 'int', default: 1 })
  combatCurrentStage: number;

  @Column({ type: 'int', default: 1 })
  combatCurrentWave: number;

  @Column({ type: 'int', default: 10 })
  combatWavesPerStage: number;

  // Location state
  @Column({ type: 'jsonb', default: '[]' })
  completedLocations: string[];

  @Column({ type: 'varchar', length: 128, nullable: true })
  currentLocation: string | null;

  @Column({ type: 'int', default: 1 })
  currentAct: number;

  // Equipment slots (relational — replaces old JSONB equipment column)
  @OneToMany(() => EquipmentSlot, (es) => es.character, { cascade: true })
  equipmentSlots: EquipmentSlot[];

  // Endgame state
  @Column({ type: 'boolean', default: false })
  endgameUnlocked: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  completedBosses: string[];

  @Column({ type: 'int', default: 0 })
  highestTierCompleted: number;

  @Column({ type: 'int', default: 0 })
  totalMapsRun: number;

  // Skill tree — allocated node IDs (JSONB array of numbers)
  @Column({ type: 'jsonb', default: '[]' })
  allocatedNodes: number[];

  // Dojo best all-time total damage (10s round)
  @Column({ type: 'int', default: 0 })
  dojoBestDamage: number;

  // Daily bonus wins — first 3 wins per day give x3 XP
  @Column({ type: 'int', default: 0 })
  dailyBonusWinsUsed: number;

  // UTC date string (YYYY-MM-DD) when bonus was last used — resets at 00:00 UTC
  @Column({ type: 'varchar', length: 10, nullable: true })
  dailyBonusResetDate: string | null;
}
