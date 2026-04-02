import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlayerLeague } from './player-league.entity';

@Entity('players')
export class Player {
  @PrimaryColumn({ type: 'bigint' })
  telegramId: string; // bigint stored as string in JS

  @Column({ type: 'varchar', length: 128, nullable: true })
  telegramUsername: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  telegramFirstName: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeLeagueId: string | null; // currently selected league

  // Global lifetime meta-stats (across all leagues)
  @Column({ type: 'bigint', default: 0 })
  totalTaps: string;

  @Column({ type: 'bigint', default: 0 })
  totalKills: string;

  @Column({ type: 'int', default: 4 })
  gameVersion: number;

  @Column({ type: 'bigint', default: 0 })
  lastSaveTime: string;

  // Last time the player made any authenticated API request
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Premium currency (global, not per-league)
  @Column({ type: 'bigint', default: 0 })
  shards: string;

  @Column({ type: 'int', default: 0 })
  extraTradeSlots: number;

  /** Skin IDs purchased with shards (default skins are always free) */
  @Column({ type: 'jsonb', default: [] })
  purchasedSkins: string[];

  /** Telegram ID of the player who referred this user (set once on first login) */
  @Column({ type: 'bigint', nullable: true })
  referrerId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  bannedUntil: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  banReason: string | null;

  @OneToMany(() => PlayerLeague, (pl) => pl.player, { cascade: true })
  playerLeagues: PlayerLeague[];
}
