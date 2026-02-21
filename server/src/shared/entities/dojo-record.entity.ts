import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Denormalized dojo leaderboard record.
 * One row per character — upserted on each dojo submit if new best.
 * Contains all data needed for leaderboard display (no JOINs required).
 */
@Entity('dojo_records')
@Index('idx_dojo_best_damage', ['bestDamage'])
@Index('idx_dojo_league_damage', ['leagueId', 'bestDamage'])
export class DojoRecord {
  /** Character ID — primary key (one record per character) */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  characterId: string;

  /** Player Telegram ID — for ownership validation */
  @Column({ type: 'bigint' })
  playerTelegramId: string;

  /** Denormalized: league ID — avoids JOIN with characters for league filtering */
  @Column({ type: 'uuid' })
  leagueId: string;

  /** Denormalized: player Telegram username (e.g. @nick) */
  @Column({ type: 'varchar', length: 128, nullable: true })
  telegramUsername: string | null;

  /** Denormalized: character nickname */
  @Column({ type: 'varchar', length: 64 })
  nickname: string;

  /** Denormalized: character class */
  @Column({ type: 'varchar', length: 32 })
  classId: string;

  /** Denormalized: character skin */
  @Column({ type: 'varchar', length: 64 })
  skinId: string;

  /** Denormalized: character level at time of best */
  @Column({ type: 'int' })
  level: number;

  /** All-time best total damage in 10s dojo round */
  @Column({ type: 'int', default: 0 })
  bestDamage: number;

  /** When the best was last updated */
  @UpdateDateColumn()
  updatedAt: Date;
}
