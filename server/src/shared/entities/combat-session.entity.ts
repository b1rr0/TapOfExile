import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('combat_sessions')
export class CombatSession {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @Column({ type: 'varchar', length: 64 })
  characterId: string;

  @Column({ type: 'uuid', nullable: true })
  leagueId: string | null;

  @Column({ type: 'varchar', length: 32 })
  mode: string; // "location" | "map" | "boss_map"

  @Column({ type: 'varchar', length: 128, nullable: true })
  locationId: string | null;

  @Column({ type: 'int', nullable: true })
  mapTier: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  bossId: string | null;

  @Column({ type: 'int' })
  totalMonsters: number;

  @Column({ type: 'int', default: 0 })
  monstersKilled: number;

  @Column({ type: 'bigint', default: 0 })
  totalGoldEarned: string;

  @Column({ type: 'bigint', default: 0 })
  totalXpEarned: string;

  @Column({ type: 'int', default: 0 })
  totalTaps: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string; // "active" | "completed" | "abandoned" | "flagged"
}
