import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../shared/entities/item.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
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
    @InjectRepository(Item)
    private itemRepo: Repository<Item>,
    @InjectRepository(EquipmentSlot)
    private equipSlotRepo: Repository<EquipmentSlot>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
  ) {}

  /**
   * Get bag items for a player league (status='bag', shared across all characters).
   */
  async getBag(playerLeagueId: string): Promise<Item[]> {
    return this.itemRepo.find({
      where: { playerLeagueId, status: 'bag' },
    });
  }

  /**
   * Roll map drops after completing a map.
   * Uses shared rollMapDrops logic with server-side item factories.
   */
  rollMapDrops(
    tier: number,
    isBossMap: boolean = false,
    direction: string | null = null,
  ): Partial<Item>[] {
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

    // Convert BagItemData to Partial<Item> (acquiredAt as string for DB)
    return drops.map((d) => ({
      ...d,
      acquiredAt: String(d.acquiredAt),
      status: 'bag' as const,
      properties: {},
    }));
  }

  /**
   * Add items to league bag (respecting max size).
   * Bag is per-league, shared among all characters.
   */
  async addItemsToBag(
    playerLeagueId: string,
    items: Partial<Item>[],
  ): Promise<Item[]> {
    const currentCount = await this.itemRepo.count({
      where: { playerLeagueId, status: 'bag' },
    });
    const space = MAX_BAG_SIZE - currentCount;

    const toAdd = items.slice(0, space).map((item) =>
      this.itemRepo.create({ ...item, playerLeagueId, status: 'bag', properties: item.properties || {} }),
    );

    return this.itemRepo.save(toAdd);
  }

  /**
   * Remove an item from the league bag.
   */
  async removeItem(playerLeagueId: string, itemId: string): Promise<void> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playerLeagueId, status: 'bag' },
    });
    if (!item) throw new NotFoundException('Item not found in bag');
    await this.itemRepo.remove(item);
  }

  // ── Potion equip/unequip ───────────────────────────────

  /**
   * Equip a potion from bag into a consumable slot on the active character.
   * Flips item.status from 'bag' → 'equipped' and creates an EquipmentSlot row.
   */
  async equipPotion(
    playerLeagueId: string,
    characterId: string,
    itemId: string,
    slot: 'consumable-1' | 'consumable-2',
  ): Promise<void> {
    // 1. Find item in bag
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playerLeagueId, status: 'bag' },
    });
    if (!item) throw new NotFoundException('Item not found in bag');
    if (item.type !== 'potion') {
      throw new BadRequestException('Item is not a potion');
    }

    // 2. If slot already occupied, unequip old item first
    const existingSlot = await this.equipSlotRepo.findOne({
      where: { characterId, slotId: slot },
    });
    if (existingSlot) {
      // Return old item to bag (flip status)
      await this.itemRepo.update(existingSlot.itemId, { status: 'bag' });
      await this.equipSlotRepo.remove(existingSlot);
    }

    // 3. Equip new item: refill charges, flip status + create equipment slot
    item.status = 'equipped';
    if (item.maxCharges) {
      item.currentCharges = item.maxCharges;
    }
    await this.itemRepo.save(item);

    const equipSlot = this.equipSlotRepo.create({
      characterId,
      slotId: slot,
      itemId: item.id,
    });
    await this.equipSlotRepo.save(equipSlot);
  }

  /**
   * Unequip a potion from a consumable slot, returning it to the bag.
   * Flips item.status from 'equipped' → 'bag' and removes the EquipmentSlot row.
   */
  async unequipPotion(
    playerLeagueId: string,
    characterId: string,
    slot: 'consumable-1' | 'consumable-2',
  ): Promise<void> {
    const equipSlot = await this.equipSlotRepo.findOne({
      where: { characterId, slotId: slot },
      relations: ['item'],
    });
    if (!equipSlot || !equipSlot.item) {
      throw new BadRequestException('No potion in that slot');
    }

    // Flip status back to 'bag'
    equipSlot.item.status = 'bag';
    await this.itemRepo.save(equipSlot.item);

    // Remove equipment slot row
    await this.equipSlotRepo.remove(equipSlot);
  }
}
