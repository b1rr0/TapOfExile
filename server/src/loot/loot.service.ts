import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BagItem } from '../shared/entities/bag-item.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import {
  rollMapDrops as sharedRollMapDrops,
  createMapKeyData,
  createBossKeyData,
} from '@shared/endgame-maps';
import type { BagItemData } from '@shared/types';

const MAX_BAG_SIZE = 32;

@Injectable()
export class LootService {
  constructor(
    @InjectRepository(BagItem)
    private bagRepo: Repository<BagItem>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
  ) {}

  /**
   * Get bag items for a player league (shared across all characters).
   */
  async getBag(playerLeagueId: string): Promise<BagItem[]> {
    return this.bagRepo.find({ where: { playerLeagueId } });
  }

  /**
   * Roll map drops after completing a map.
   * Uses shared rollMapDrops logic with server-side item factories.
   */
  rollMapDrops(
    tier: number,
    isBossMap: boolean = false,
    direction: string | null = null,
  ): Partial<BagItem>[] {
    // Server factory: creates map key data (no location enrichment on server)
    const serverCreateMapKey = (t: number): BagItemData => {
      const data = createMapKeyData(t);
      return { ...data, name: `Tier ${t} Map Key` };
    };

    // Server factory: creates boss key data
    const serverCreateBossKey = (bossId: string, bkt: number): BagItemData | null => {
      return createBossKeyData(bossId, bkt);
    };

    const drops = sharedRollMapDrops(
      tier,
      isBossMap,
      direction,
      serverCreateMapKey,
      serverCreateBossKey,
    );

    // Convert BagItemData to Partial<BagItem> (acquiredAt as string for DB)
    return drops.map((d) => ({
      ...d,
      acquiredAt: String(d.acquiredAt),
    }));
  }

  /**
   * Add items to league bag (respecting max size).
   * Bag is now per-league, shared among all characters.
   */
  async addItemsToBag(
    playerLeagueId: string,
    items: Partial<BagItem>[],
  ): Promise<BagItem[]> {
    const currentCount = await this.bagRepo.count({
      where: { playerLeagueId },
    });
    const space = MAX_BAG_SIZE - currentCount;

    const toAdd = items.slice(0, space).map((item) =>
      this.bagRepo.create({ ...item, playerLeagueId }),
    );

    return this.bagRepo.save(toAdd);
  }

  /**
   * Remove an item from the league bag.
   */
  async removeItem(playerLeagueId: string, itemId: string): Promise<void> {
    const item = await this.bagRepo.findOne({
      where: { id: itemId, playerLeagueId },
    });
    if (!item) throw new NotFoundException('Item not found in bag');
    await this.bagRepo.remove(item);
  }
}
