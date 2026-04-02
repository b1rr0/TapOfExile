import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PlayerLeague } from './player-league.entity';
import { Item } from './item.entity';

@Entity('trade_listings')
// ── Partial indexes for active listings (browse) ─────────────────
@Index('idx_trade_browse_newest', ['leagueId', 'createdAt'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_browse_price', ['leagueId', 'price'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_type_price', ['leagueId', 'itemType', 'price'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_quality_price', ['leagueId', 'itemQuality', 'price'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_subtype', ['leagueId', 'itemSubtype'], {
  where: `"status" = 'active' AND "itemSubtype" IS NOT NULL`,
})
// ── Seller / expiration / history ────────────────────────────────
@Index('idx_trade_seller_active', ['sellerPlayerLeagueId'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_expires', ['expiresAt'], {
  where: `"status" = 'active'`,
})
@Index('idx_trade_seller_hist', ['sellerTelegramId', 'createdAt'])
@Index('idx_trade_buyer_hist', ['buyerTelegramId', 'createdAt'])
@Index('idx_trade_sold_at', ['soldAt'], {
  where: `"status" = 'sold'`,
})
export class TradeListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Seller ──────────────────────────────────────────────────────

  @Column({ type: 'uuid' })
  sellerPlayerLeagueId: string;

  @ManyToOne(() => PlayerLeague, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerPlayerLeagueId' })
  sellerPlayerLeague: PlayerLeague;

  @Column({ type: 'bigint' })
  sellerTelegramId: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sellerName: string | null; // denormalized character nickname

  // ── Buyer (filled on purchase) ─────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  buyerPlayerLeagueId: string | null;

  @Column({ type: 'bigint', nullable: true })
  buyerTelegramId: string | null;

  // ── League scope ───────────────────────────────────────────────

  @Column({ type: 'uuid' })
  leagueId: string;

  // ── Item reference (escrowed) ──────────────────────────────────

  @Column({ type: 'varchar', length: 128 })
  itemId: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  // ── Denormalized item fields for fast filtering ────────────────

  @Column({ type: 'varchar', length: 128 })
  itemName: string;

  @Column({ type: 'varchar', length: 32 })
  itemType: string; // 'potion' | 'map_key' | 'boss_key' | 'equipment'

  @Column({ type: 'varchar', length: 32 })
  itemQuality: string; // 'common' | 'rare' | 'epic' | 'legendary'

  @Column({ type: 'int', nullable: true })
  itemLevel: number | null;

  @Column({ type: 'int', nullable: true })
  itemTier: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemIcon: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  itemSubtype: string | null; // equipment slot: 'helmet'/'armor'/'boots'/etc.

  @Column({ type: 'jsonb', default: '{}' })
  itemSnapshot: Record<string, unknown>; // full item data for tooltip rendering

  // ── Pricing ────────────────────────────────────────────────────

  @Column({ type: 'bigint' })
  price: string; // asking price in gold (bigint → string in JS)

  // ── Status ─────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string; // 'active' | 'sold' | 'cancelled' | 'expired'

  // ── Timestamps ─────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  soldAt: Date | null;
}
