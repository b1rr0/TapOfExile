import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerLeague } from './player-league.entity';

@Entity('bag_items')
export class BagItem {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id: string;

  @Column({ type: 'uuid' })
  playerLeagueId: string;

  @ManyToOne(() => PlayerLeague, (pl) => pl.bag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerLeagueId' })
  playerLeague: PlayerLeague;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 32 })
  quality: string;

  @Column({ type: 'int', nullable: true })
  level: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  icon: string | null;

  @Column({ type: 'bigint' })
  acquiredAt: string;

  @Column({ type: 'int', nullable: true })
  tier: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  locationId: string | null;

  @Column({ type: 'int', nullable: true })
  locationAct: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  bossId: string | null;

  @Column({ type: 'int', nullable: true })
  bossKeyTier: number | null;
}
