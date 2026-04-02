import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Item } from '../shared/entities/item.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { Character } from '../shared/entities/character.entity';
import {
  createMapKeyData,
  createBossKeyData,
  pickBossKeyTier,
  BOSS_MAPS,
} from '@shared/endgame-maps';
import type { BagItemData } from '@shared/types';
import { canEquipInSlot, UI_SLOT_ACCEPTS } from '@shared/equipment-defs';
import type { EquipmentSlotId } from '@shared/equipment-defs';

const MAX_BAG_SIZE = 52;

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

  /** Helper: convert BagItemData to Partial<Item> for DB persistence. */
  private toItem(d: BagItemData): Partial<Item> {
    return {
      ...d,
      acquiredAt: String(d.acquiredAt),
      status: 'bag' as const,
      properties: {},
    };
  }

  /** Helper: create a map key Partial<Item> for a given tier. */
  private makeMapKey(tier: number): Partial<Item> {
    const data = createMapKeyData(tier);
    return this.toItem({ ...data, name: `Tier ${tier} Map Key` });
  }

  /**
   * Roll map KEY drops after completing a map (separate from loot).
   *
   * Single roll, mutually exclusive:
   * - 90% → 1 key of current tier
   * -  5% → 1 key of next tier (capped at max)
   * -  5% → 2 keys of current tier
   */
  rollMapKeyDrops(tier: number): Partial<Item>[] {
    const roll = Math.random();
    if (roll < 0.05) {
      return [this.makeMapKey(tier), this.makeMapKey(tier)];
    } else if (roll < 0.10) {
      return [this.makeMapKey(Math.min(tier + 1, 10))];
    }
    return [this.makeMapKey(tier)];
  }

  /**
   * Roll boss KEY drops (independent from map keys and loot).
   *
   * 5% chance. Only from tier 5+ regular maps or any boss map.
   */
  rollBossKeyDrops(
    tier: number,
    isBossMap: boolean = false,
    direction: string | null = null,
  ): Partial<Item>[] {
    const minTier = isBossMap ? 1 : 5;
    if (tier < minTier || Math.random() >= 0.05) return [];

    const bkt = pickBossKeyTier(tier, isBossMap);
    const bossId = direction || BOSS_MAPS[Math.floor(Math.random() * BOSS_MAPS.length)].id;
    const item = createBossKeyData(bossId, bkt);
    return item ? [this.toItem(item)] : [];
  }

  /**
   * Roll map key drops for Act 5 locations.
   *
   * Single roll, mutually exclusive:
   * - 90% → 1 Tier-1 key
   * -  5% → 1 Tier-2 key
   * -  5% → 2 Tier-1 keys
   */
  rollActMapKeyDrops(): Partial<Item>[] {
    const drops: Partial<Item>[] = [];

    const roll = Math.random();
    if (roll < 0.05) {
      // 5%: 2× Tier 1
      drops.push(this.makeMapKey(1));
      drops.push(this.makeMapKey(1));
    } else if (roll < 0.10) {
      // 5%: Tier 2
      drops.push(this.makeMapKey(2));
    } else {
      // 90%: 1× Tier 1
      drops.push(this.makeMapKey(1));
    }

    return drops;
  }

  /**
   * Add items to league bag (respecting max size).
   * Bag is per-league, shared among all characters.
   */
  async addItemsToBag(
    playerLeagueId: string,
    items: Partial<Item>[],
    extraBagSlots = 0,
  ): Promise<Item[]> {
    const currentCount = await this.itemRepo.count({
      where: { playerLeagueId, status: 'bag' },
    });
    const space = (MAX_BAG_SIZE + extraBagSlots) - currentCount;

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

  /**
   * Sell an item from the league bag for gold.
   * Price = basePrice × qualityMultiplier.
   * Returns the gold earned.
   */
  async sellItem(playerLeagueId: string, itemId: string): Promise<{ gold: number }> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playerLeagueId, status: 'bag' },
    });
    if (!item) throw new NotFoundException('Item not found in bag');

    const gold = this.calculateSellPrice(item);

    // Add gold to player league
    const pl = await this.playerLeagueRepo.findOneBy({ id: playerLeagueId });
    if (!pl) throw new NotFoundException('Player league not found');
    pl.gold = (BigInt(pl.gold) + BigInt(gold)).toString();
    await this.playerLeagueRepo.save(pl);

    // Remove item
    await this.itemRepo.remove(item);

    return { gold };
  }

  /**
   * Calculate sell price for an item.
   * Equipment: progressive curve based on iLvl + quality.
   *   basePrice = 5 + 0.008 × iLvl³  →  lvl 1 ≈ 5g, lvl 10 ≈ 13g, lvl 50 ≈ 1005g
   *   finalPrice = floor(basePrice × qualityMul)
   */
  calculateSellPrice(item: Item): number {
    const qualityMul: Record<string, number> = {
      common: 1, rare: 3, epic: 8, legendary: 20,
    };
    const mul = qualityMul[item.quality] || 1;

    if (item.type === 'equipment') {
      const iLvl = (item.properties as any)?.itemLevel || item.level || 1;
      const basePrice = 5 + 0.008 * iLvl * iLvl * iLvl;
      return Math.max(1, Math.floor(basePrice * mul));
    }
    if (item.type === 'potion') {
      return Math.max(1, 5 * mul);
    }
    if (item.type === 'map_key') {
      return Math.max(1, (item.tier || 1) * 10);
    }
    if (item.type === 'boss_map_key') {
      return Math.max(1, (item.bossKeyTier || 1) * 50);
    }
    return 1;
  }

  /**
   * Bulk sell multiple items from the bag.
   * Returns total gold earned.
   */
  async bulkSell(playerLeagueId: string, itemIds: string[]): Promise<{ gold: number; sold: number }> {
    if (!itemIds.length) return { gold: 0, sold: 0 };

    const items = await this.itemRepo.find({
      where: { id: In(itemIds), playerLeagueId, status: 'bag' },
    });

    if (!items.length) return { gold: 0, sold: 0 };

    let totalGold = 0;
    for (const item of items) {
      totalGold += this.calculateSellPrice(item);
    }

    // Add gold to player league
    const pl = await this.playerLeagueRepo.findOneBy({ id: playerLeagueId });
    if (!pl) throw new NotFoundException('Player league not found');
    pl.gold = (BigInt(pl.gold) + BigInt(totalGold)).toString();
    await this.playerLeagueRepo.save(pl);

    // Remove all sold items
    await this.itemRepo.remove(items);

    return { gold: totalGold, sold: items.length };
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

  // ── Gear equip/unequip ──────────────────────────────────

  /**
   * Equip a gear item from bag into an equipment slot.
   * Validates:
   * - item exists in bag and is type 'equipment'
   * - item's equipment slot matches target UI slot
   * - character level >= item's required level
   *
   * If slot is occupied, old item is returned to bag.
   */
  async equipItem(
    playerLeagueId: string,
    characterId: string,
    itemId: string,
    uiSlotId: string,
  ): Promise<void> {
    // 1. Validate UI slot is a real equipment slot (not consumable)
    if (!UI_SLOT_ACCEPTS[uiSlotId]) {
      throw new BadRequestException(`Invalid equipment slot: ${uiSlotId}`);
    }

    // 2. Find item in bag
    const item = await this.itemRepo.findOne({
      where: { id: itemId, playerLeagueId, status: 'bag' },
    });
    if (!item) throw new NotFoundException('Item not found in bag');
    if (item.type !== 'equipment') {
      throw new BadRequestException('Item is not equipment');
    }

    // 3. Validate item slot matches target UI slot
    const itemSlot = (item.properties as any)?.slot as EquipmentSlotId | undefined;
    if (!itemSlot) {
      throw new BadRequestException('Item has no equipment slot defined');
    }
    if (!canEquipInSlot(itemSlot, uiSlotId)) {
      throw new BadRequestException(
        `Cannot equip ${itemSlot} item into ${uiSlotId} slot`,
      );
    }

    // 4. Check character level >= item reqLevel
    const character = await this.charRepo.findOne({
      where: { id: characterId, playerLeagueId },
    });
    if (!character) throw new NotFoundException('Character not found');

    const reqLevel = (item.properties as any)?.reqLevel ?? 0;
    if (character.level < reqLevel) {
      throw new BadRequestException(
        `Character level ${character.level} is too low. Required: ${reqLevel}`,
      );
    }

    // 5. If two-hand weapon, clear both weapon slots
    if (itemSlot === 'two_hand') {
      await this._clearSlot(characterId, 'weapon-left');
      await this._clearSlot(characterId, 'weapon-right');
    } else {
      // 6. If equipping one-hand to weapon-left, check if two-hand is there
      if (uiSlotId === 'weapon-left' || uiSlotId === 'weapon-right') {
        const otherSlot = uiSlotId === 'weapon-left' ? 'weapon-right' : 'weapon-left';
        const otherEquip = await this.equipSlotRepo.findOne({
          where: { characterId, slotId: otherSlot },
          relations: ['item'],
        });
        // If the other slot has a two-hand weapon, unequip it
        if (otherEquip?.item) {
          const otherItemSlot = (otherEquip.item.properties as any)?.slot;
          if (otherItemSlot === 'two_hand') {
            await this._clearSlot(characterId, otherSlot);
          }
        }
      }
      // Clear target slot
      await this._clearSlot(characterId, uiSlotId);
    }

    // 7. Equip: flip status + create equipment slot
    item.status = 'equipped';
    await this.itemRepo.save(item);

    const equipSlot = this.equipSlotRepo.create({
      characterId,
      slotId: uiSlotId,
      itemId: item.id,
    });
    await this.equipSlotRepo.save(equipSlot);
  }

  /**
   * Unequip a gear item from an equipment slot, returning it to bag.
   */
  async unequipItem(
    playerLeagueId: string,
    characterId: string,
    uiSlotId: string,
  ): Promise<void> {
    if (!UI_SLOT_ACCEPTS[uiSlotId]) {
      throw new BadRequestException(`Invalid equipment slot: ${uiSlotId}`);
    }

    await this._clearSlot(characterId, uiSlotId);
  }

  /**
   * Helper: clear an equipment slot, returning its item to bag.
   */
  private async _clearSlot(characterId: string, slotId: string): Promise<void> {
    const existing = await this.equipSlotRepo.findOne({
      where: { characterId, slotId },
    });
    if (!existing) return;

    // Return item to bag
    await this.itemRepo.update(existing.itemId, { status: 'bag' });
    await this.equipSlotRepo.remove(existing);
  }
}
