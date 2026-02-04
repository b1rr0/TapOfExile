import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlayerLeague } from './player-league.entity';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string; // "Standard", "Monthly #7 – Feb 2026"

  @Column({ type: 'varchar', length: 16 })
  type: string; // "standard" | "monthly"

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string; // "active" | "completed" | "migrating"

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null; // null for Standard

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PlayerLeague, (pl) => pl.league)
  playerLeagues: PlayerLeague[];
}
