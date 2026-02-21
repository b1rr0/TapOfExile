import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Player } from './player.entity';
import { League } from './league.entity';
import { Character } from './character.entity';
import { Item } from './item.entity';

@Entity('player_leagues')
@Unique(['playerTelegramId', 'leagueId'])
@Index('idx_pl_league', ['leagueId'])
export class PlayerLeague {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  playerTelegramId: string;

  @ManyToOne(() => Player, (player) => player.playerLeagues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playerTelegramId' })
  player: Player;

  @Column({ type: 'uuid' })
  leagueId: string;

  @ManyToOne(() => League, (league) => league.playerLeagues, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leagueId' })
  league: League;

  @Column({ type: 'bigint', default: 0 })
  gold: string; // per-league gold pool

  @Column({ type: 'varchar', length: 64, nullable: true })
  activeCharacterId: string | null; // per-league active character

  @CreateDateColumn()
  joinedAt: Date;

  @OneToMany(() => Character, (char) => char.playerLeague, { cascade: true })
  characters: Character[];

  @OneToMany(() => Item, (item) => item.playerLeague, { cascade: true })
  items: Item[];
}
