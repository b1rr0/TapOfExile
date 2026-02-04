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

  @Column({ type: 'bigint', default: 0 })
  totalGold: string;

  @Column({ type: 'int', default: 4 })
  gameVersion: number;

  @Column({ type: 'bigint', default: 0 })
  lastSaveTime: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PlayerLeague, (pl) => pl.player, { cascade: true })
  playerLeagues: PlayerLeague[];
}
