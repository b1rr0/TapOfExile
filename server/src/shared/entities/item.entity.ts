import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PlayerLeague } from './player-league.entity';

@Entity('items')
@Index('idx_item_pl_status', ['playerLeagueId', 'status'])
export class Item {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  id: string;

  @Column({ type: 'uuid' })
  playerLeagueId: string;

  @ManyToOne(() => PlayerLeague, (pl) => pl.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerLeagueId' })
  playerLeague: PlayerLeague;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  type: string; // 'map_key' | 'boss_key' | 'potion' | future gear types

  @Column({ type: 'varchar', length: 32 })
  quality: string; // 'common' | 'rare' | 'epic' | 'legendary'

  @Column({ type: 'varchar', length: 16, default: 'bag' })
  status: string; // 'bag' | 'equipped' | future: 'trade'

  @Column({ type: 'int', nullable: true })
  level: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string | null;

  @Column({ type: 'bigint' })
  acquiredAt: string;

  // ── Drop source metadata ─────────────────────────────

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

  // ── Potion fields (hot path — real columns, NOT in JSONB) ──

  @Column({ type: 'varchar', length: 32, nullable: true })
  flaskType: string | null;

  @Column({ type: 'int', nullable: true })
  maxCharges: number | null;

  @Column({ type: 'int', nullable: true })
  currentCharges: number | null;

  @Column({ type: 'float', nullable: true })
  healPercent: number | null;

  // ── Extensible properties for future item types ──────

  @Column({ type: 'jsonb', default: '{}' })
  properties: Record<string, unknown>;
}
