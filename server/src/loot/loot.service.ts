import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BagItem } from '../shared/entities/bag-item.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

const MAX_BAG_SIZE = 32;

interface DropSettings {
  regular: {
    sameTierChance: number;
    tierUpChance: number;
    bossKeyChance: number;
    bossKeyMinTier: number;
  };
  boss: {
    guaranteedTierMin: number;
    guaranteedTierMax: number;
    bonusKeyChance: number;
    bossKeyChance: number;
  };
}

const DROP_SETTINGS: DropSettings = {
  regular: {
    sameTierChance: 0.60,
    tierUpChance: 0.20,
    bossKeyChance: 0.05,
    bossKeyMinTier: 5,
  },
  boss: {
    guaranteedTierMin: 5,
    guaranteedTierMax: 8,
    bonusKeyChance: 0.30,
    bossKeyChance: 0.05,
  },
};

const MAX_TIER = 10;

const BOSS_MAPS = [
  'boss_shadow_shogun', 'boss_ancient_dragon', 'boss_demon_oni',
  'boss_wind_tengu', 'boss_phantom_ronin', 'boss_forest_guardian',
  'boss_beast_king', 'boss_bandit_lord',
];

const BOSS_KEY_TIERS = [
  { tier: 1, quality: 'boss_silver' },
  { tier: 2, quality: 'boss_gold' },
  { tier: 3, quality: 'boss_red' },
];

function tierQuality(tier: number): string {
  if (tier <= 3) return 'common';
  if (tier <= 6) return 'rare';
  if (tier <= 9) return 'epic';
  return 'legendary';
}

function pickBossKeyTier(sourceTier: number, isBossMap: boolean): number {
  if (isBossMap) return 3;
  if (sourceTier >= 9) return 3;
  if (sourceTier >= 7) return 2;
  return 1;
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

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
   * Ported from bot/src/data/endgame-maps.ts: rollMapDrops
   */
  rollMapDrops(
    tier: number,
    isBossMap: boolean = false,
    direction: string | null = null,
  ): Partial<BagItem>[] {
    const drops: Partial<BagItem>[] = [];
    const S = DROP_SETTINGS;

    if (isBossMap) {
      const range = S.boss.guaranteedTierMax - S.boss.guaranteedTierMin + 1;
      const dropTier = Math.min(
        MAX_TIER,
        Math.floor(Math.random() * range) + S.boss.guaranteedTierMin,
      );
      drops.push(this.createMapKeyData(dropTier));

      if (Math.random() < S.boss.bonusKeyChance) {
        drops.push(this.createMapKeyData(Math.min(MAX_TIER, dropTier + 1)));
      }

      if (Math.random() < S.boss.bossKeyChance) {
        const bkt = pickBossKeyTier(tier, true);
        const bossId = direction || BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
        drops.push(this.createBossKeyData(bossId, bkt));
      }

      return drops;
    }

    // Regular map drops
    if (Math.random() < S.regular.sameTierChance) {
      drops.push(this.createMapKeyData(tier));
    }
    if (tier < MAX_TIER && Math.random() < S.regular.tierUpChance) {
      drops.push(this.createMapKeyData(Math.min(MAX_TIER, tier + 1)));
    }
    if (tier >= S.regular.bossKeyMinTier && Math.random() < S.regular.bossKeyChance) {
      const bkt = pickBossKeyTier(tier, false);
      const bossId = direction || BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)];
      drops.push(this.createBossKeyData(bossId, bkt));
    }

    return drops;
  }

  private createMapKeyData(tier: number): Partial<BagItem> {
    return {
      id: `map_t${tier}_${uid()}`,
      name: `Tier ${tier} Map Key`,
      type: 'map_key',
      tier,
      quality: tierQuality(tier),
      level: tier,
      icon: '\uD83D\uDDFA\uFE0F',
      acquiredAt: String(Date.now()),
    };
  }

  private createBossKeyData(bossId: string, bossKeyTier: number): Partial<BagItem> {
    const bkt = BOSS_KEY_TIERS[Math.min(bossKeyTier - 1, 2)];
    return {
      id: `bosskey_${bossId}_t${bossKeyTier}_${uid()}`,
      name: bossId,
      type: 'boss_map_key',
      bossId,
      bossKeyTier,
      quality: bkt.quality,
      level: bossKeyTier,
      icon: '\uD83D\uDC80',
      acquiredAt: String(Date.now()),
    };
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
