import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { ElementalDamage } from '@shared/types';
import { Player } from './player.entity';
import { PlayerLeague } from './player-league.entity';

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

  @Column({ type: 'int', default: 1 })
  tapDamage: number;

  @Column({ type: 'float', default: 0.05 })
  critChance: number;

  @Column({ type: 'float', default: 2.0 })
  critMultiplier: number;

  @Column({ type: 'float', default: 0 })
  passiveDps: number;

  // Elemental damage profile (fractions summing to ~1.0)
  @Column({ type: 'jsonb', default: '{"physical":1.0}' })
  elementalDamage: ElementalDamage;

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

  // Inventory (character-bound equipment)
  @Column({ type: 'jsonb', default: '{}' })
  equipment: Record<string, unknown>;

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
}
