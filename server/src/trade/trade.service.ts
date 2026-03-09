import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThan } from 'typeorm';
import { TradeListing } from '../shared/entities/trade-listing.entity';
import { Item } from '../shared/entities/item.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
import { BrowseListingsDto } from './dto/browse-listings.dto';

const MIN_TRADE_LEVEL = 10;
const LISTING_EXPIRY_HOURS = 48;
const LISTING_FEE_RATE = 3n; // 3% listing fee (seller pays upfront)
const LISTING_FEE_FLAT = 20n; // +20 gold flat listing fee
const BUYER_TAX_RATE = 5n; // 5% buyer tax on purchase
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class TradeService implements OnModuleInit {
  private _statsCache: { data: any; cachedAt: number } | null = null;

  constructor(
    @InjectRepository(TradeListing)
    private listingRepo: Repository<TradeListing>,
    @InjectRepository(Item)
    private itemRepo: Repository<Item>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create pg_trgm extension + GIN index for text search on init.
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(
        `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
      );
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_trade_name_trgm
        ON trade_listings USING GIN ("itemName" gin_trgm_ops)
        WHERE status = 'active'
      `);
    } catch (err) {
      console.warn('[TradeService] pg_trgm setup skipped:', (err as Error).message);
    }
  }

  // ── Create Listing ─────────────────────────────────────────────

  async createListing(
    telegramId: string,
    playerLeague: PlayerLeague,
    itemId: string,
    price: string,
    maxActiveListings: number,
  ): Promise<TradeListing> {
    // 1. Validate character level
    const char = await this.charRepo.findOne({
      where: { id: playerLeague.activeCharacterId!, playerLeagueId: playerLeague.id },
    });
    if (!char) throw new BadRequestException('No active character');
    if (char.level < MIN_TRADE_LEVEL) {
      throw new BadRequestException(
        `Character must be at least level ${MIN_TRADE_LEVEL} to trade`,
      );
    }

    // 2. Check active listings count
    const activeCount = await this.listingRepo.count({
      where: {
        sellerPlayerLeagueId: playerLeague.id,
        status: 'active',
      },
    });
    if (activeCount >= maxActiveListings) {
      throw new BadRequestException(
        `Maximum ${maxActiveListings} active listings allowed. Purchase more trade slots in the shop.`,
      );
    }

    // 3. Find item in bag
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playerLeagueId: playerLeague.id, status: 'bag' },
    });
    if (!item) throw new NotFoundException('Item not found in bag');

    // 4. Validate price
    const priceVal = BigInt(price);
    if (priceVal < 1n) {
      throw new BadRequestException('Price must be at least 1 gold');
    }

    // 4b. Calculate listing fee (3% + 20 gold) and check seller can afford it
    const listingFee = priceVal * LISTING_FEE_RATE / 100n + LISTING_FEE_FLAT;
    const sellerGold = BigInt(playerLeague.gold);
    if (sellerGold < listingFee) {
      throw new BadRequestException(
        `Insufficient gold for listing fee. Need ${listingFee.toString()}, have ${sellerGold.toString()}`,
      );
    }

    // 5. Derive item subtype for equipment filtering
    let itemSubtype: string | null = null;
    if (item.type === 'equipment') {
      itemSubtype = (item.properties as any)?.slot ?? null;
    }

    // 6. Build item snapshot (full data for tooltip rendering)
    const itemSnapshot: Record<string, unknown> = {
      name: item.name,
      type: item.type,
      quality: item.quality,
      level: item.level,
      icon: item.icon,
      tier: item.tier,
      properties: item.properties,
      flaskType: item.flaskType,
      maxCharges: item.maxCharges,
      healPercent: item.healPercent,
      bossKeyTier: item.bossKeyTier,
    };

    // 7. Transaction: escrow item + create listing
    const expiresAt = new Date(Date.now() + LISTING_EXPIRY_HOURS * 3600_000);

    return this.dataSource.transaction(async (em) => {
      // Deduct listing fee from seller
      const sellerPl = await em.getRepository(PlayerLeague).findOneBy({
        id: playerLeague.id,
      });
      sellerPl!.gold = (BigInt(sellerPl!.gold) - listingFee).toString();
      await em.save(sellerPl!);

      item.status = 'trade';
      await em.save(item);

      const listing = this.listingRepo.create({
        sellerPlayerLeagueId: playerLeague.id,
        sellerTelegramId: telegramId,
        sellerName: char.nickname,
        leagueId: playerLeague.leagueId,
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        itemQuality: item.quality,
        itemLevel: item.level,
        itemTier: item.tier,
        itemIcon: item.icon,
        itemSubtype,
        itemSnapshot,
        price,
        status: 'active',
        expiresAt,
      });

      return em.save(listing);
    });
  }

  // ── Buy Listing ────────────────────────────────────────────────

  async buyListing(
    telegramId: string,
    buyerPlayerLeague: PlayerLeague,
    listingId: string,
  ): Promise<{ goldSpent: string; listing: TradeListing }> {
    return this.dataSource.transaction('SERIALIZABLE', async (em) => {
      // 1. Lock and load listing
      const listing = await em
        .getRepository(TradeListing)
        .createQueryBuilder('l')
        .setLock('pessimistic_write')
        .where('l.id = :id', { id: listingId })
        .andWhere('l.status = :status', { status: 'active' })
        .getOne();

      if (!listing) {
        throw new BadRequestException('Listing no longer available');
      }

      // 2. Check expiration
      if (listing.expiresAt <= new Date()) {
        throw new BadRequestException('Listing has expired');
      }

      // 3. Can't buy own listing
      if (listing.sellerPlayerLeagueId === buyerPlayerLeague.id) {
        throw new BadRequestException('Cannot buy your own listing');
      }

      // 4. Check same league
      if (listing.leagueId !== buyerPlayerLeague.leagueId) {
        throw new BadRequestException('Listing is in a different league');
      }

      // 5. Calculate gold
      const listPrice = BigInt(listing.price);
      const buyerTax = listPrice * BUYER_TAX_RATE / 100n;
      const buyerPays = listPrice + buyerTax; // price + 5% tax
      const sellerReceives = listPrice; // seller gets full price (already paid listing fee)

      // 6. Check buyer gold
      const buyerGold = BigInt(buyerPlayerLeague.gold);
      if (buyerGold < buyerPays) {
        throw new BadRequestException(
          `Insufficient gold. Need ${buyerPays.toString()}, have ${buyerGold.toString()}`,
        );
      }

      // 7. Deduct from buyer
      const buyerPl = await em.getRepository(PlayerLeague).findOneBy({
        id: buyerPlayerLeague.id,
      });
      buyerPl!.gold = (BigInt(buyerPl!.gold) - buyerPays).toString();
      await em.save(buyerPl!);

      // 8. Credit seller
      const sellerPl = await em.getRepository(PlayerLeague).findOneBy({
        id: listing.sellerPlayerLeagueId,
      });
      sellerPl!.gold = (BigInt(sellerPl!.gold) + sellerReceives).toString();
      await em.save(sellerPl!);

      // 9. Transfer item to buyer's bag
      const item = await em.getRepository(Item).findOneBy({ id: listing.itemId });
      if (item) {
        item.playerLeagueId = buyerPlayerLeague.id;
        item.status = 'bag';
        await em.save(item);
      }

      // 10. Update listing
      listing.status = 'sold';
      listing.buyerPlayerLeagueId = buyerPlayerLeague.id;
      listing.buyerTelegramId = telegramId;
      listing.soldAt = new Date();
      await em.save(listing);

      return { goldSpent: buyerPays.toString(), listing };
    });
  }

  // ── Cancel Listing ─────────────────────────────────────────────

  async cancelListing(
    playerLeague: PlayerLeague,
    listingId: string,
  ): Promise<void> {
    const listing = await this.listingRepo.findOne({
      where: {
        id: listingId,
        sellerPlayerLeagueId: playerLeague.id,
        status: 'active',
      },
    });

    if (!listing) throw new NotFoundException('Active listing not found');

    await this.dataSource.transaction(async (em) => {
      listing.status = 'cancelled';
      await em.save(listing);

      await em
        .getRepository(Item)
        .update(listing.itemId, { status: 'bag' });
    });
  }

  // ── Browse Listings ────────────────────────────────────────────

  async browse(
    dto: BrowseListingsDto,
  ): Promise<{ listings: TradeListing[]; total: number }> {
    // Lazy expiration: hide expired from results
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .where('l.status = :status', { status: 'active' })
      .andWhere('l.expiresAt > :now', { now: new Date() });

    // League filter
    if (dto.leagueId) {
      qb.andWhere('l.leagueId = :leagueId', { leagueId: dto.leagueId });
    }

    // Type filter
    if (dto.itemType) {
      qb.andWhere('l.itemType = :itemType', { itemType: dto.itemType });
    }

    // Quality filter
    if (dto.quality) {
      qb.andWhere('l.itemQuality = :quality', { quality: dto.quality });
    }

    // Subtype filter (equipment slot)
    if (dto.itemSubtype) {
      qb.andWhere('l.itemSubtype = :itemSubtype', {
        itemSubtype: dto.itemSubtype,
      });
    }

    // Text search (uses pg_trgm GIN index)
    if (dto.search) {
      qb.andWhere('l.itemName ILIKE :search', {
        search: `%${dto.search}%`,
      });
    }

    // Sorting
    switch (dto.sort) {
      case 'price_asc':
        qb.orderBy('l.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('l.price', 'DESC');
        break;
      case 'quality':
        qb.orderBy(
          `CASE l.itemQuality
            WHEN 'legendary' THEN 1
            WHEN 'epic' THEN 2
            WHEN 'rare' THEN 3
            WHEN 'common' THEN 4
            ELSE 5
          END`,
          'ASC',
        );
        break;
      case 'newest':
      default:
        qb.orderBy('l.createdAt', 'DESC');
        break;
    }

    // Pagination
    const offset = Math.min(dto.offset ?? 0, 500);
    const limit = Math.min(dto.limit ?? 20, 50);
    qb.skip(offset).take(limit);

    const [listings, total] = await qb.getManyAndCount();
    return { listings, total };
  }

  // ── My Listings ────────────────────────────────────────────────

  async myListings(playerLeagueId: string): Promise<TradeListing[]> {
    return this.listingRepo.find({
      where: {
        sellerPlayerLeagueId: playerLeagueId,
        status: 'active',
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Trade History ──────────────────────────────────────────────

  async history(
    telegramId: string,
    limit = 50,
  ): Promise<TradeListing[]> {
    return this.listingRepo
      .createQueryBuilder('l')
      .where(
        '(l.sellerTelegramId = :tid OR l.buyerTelegramId = :tid)',
        { tid: telegramId },
      )
      .andWhere('l.status IN (:...statuses)', {
        statuses: ['sold', 'cancelled', 'expired'],
      })
      .orderBy('l.createdAt', 'DESC')
      .take(Math.min(limit, 100))
      .getMany();
  }

  // ── Expire Cleanup (called from cron or lazy) ──────────────────

  async cleanupExpiredListings(): Promise<number> {
    const expired = await this.listingRepo.find({
      where: {
        status: 'active',
        expiresAt: LessThanOrEqual(new Date()),
      },
      take: 200, // batch limit
    });

    if (expired.length === 0) return 0;

    await this.dataSource.transaction(async (em) => {
      const itemIds = expired.map((l) => l.itemId);

      // Return all items to bag
      await em
        .getRepository(Item)
        .createQueryBuilder()
        .update()
        .set({ status: 'bag' })
        .whereInIds(itemIds)
        .execute();

      // Mark listings as expired
      await em
        .getRepository(TradeListing)
        .createQueryBuilder()
        .update()
        .set({ status: 'expired' })
        .whereInIds(expired.map((l) => l.id))
        .execute();
    });

    return expired.length;
  }

  // ── Stats ──────────────────────────────────────────────────────

  async getStats(leagueId?: string): Promise<{
    activeListings: number;
    trades24h: number;
    goldVolume24h: string;
  }> {
    if (
      this._statsCache &&
      Date.now() - this._statsCache.cachedAt < STATS_CACHE_TTL
    ) {
      return this._statsCache.data;
    }

    const activeWhere: any = { status: 'active' };
    if (leagueId) activeWhere.leagueId = leagueId;

    const activeListings = await this.listingRepo.count({
      where: activeWhere,
    });

    const since = new Date(Date.now() - 86_400_000);
    const sold24hQb = this.listingRepo
      .createQueryBuilder('l')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(l.price::bigint), 0)', 'volume')
      .where('l.status = :status', { status: 'sold' })
      .andWhere('l.soldAt > :since', { since });

    if (leagueId) {
      sold24hQb.andWhere('l.leagueId = :leagueId', { leagueId });
    }

    const sold24h = await sold24hQb.getRawOne();

    const data = {
      activeListings,
      trades24h: Number(sold24h?.count ?? 0),
      goldVolume24h: sold24h?.volume?.toString() ?? '0',
    };

    this._statsCache = { data, cachedAt: Date.now() };
    return data;
  }
}
