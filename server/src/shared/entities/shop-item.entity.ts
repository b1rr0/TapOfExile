import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * ShopItem — catalog of items purchasable with Shards.
 *
 * Stored in DB so items can be enabled/disabled without redeploying.
 */
@Entity('shop_items')
export class ShopItem {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string; // e.g. 'trade_slots_10'

  @Column({ type: 'varchar', length: 128 })
  label: string;

  @Column({ type: 'varchar', length: 512 })
  description: string;

  @Column({ type: 'varchar', length: 64 })
  category: string; // 'upgrades', 'cosmetics', etc.

  @Column({ type: 'int' })
  priceShards: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /** Extra parameters (e.g. { slots: 10 }) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
