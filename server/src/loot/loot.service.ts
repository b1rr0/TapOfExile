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
import { canEquipInSlot, UI_SLOT_ACCEPTS } from '@shared/equipment-defs';
import type { EquipmentSlotId } from '@shared/equipment-defs';

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
   * Equipment: itemLevel × qualityMul (common=1, rare=3, epic=8, legendary=20)
   * Potions: 5 × qualityMul
   * Map keys: tier × 10
   * Boss keys: bossKeyTier × 50
   */
  calculateSellPrice(item: Item): number {
    const qualityMul: Record<string, number> = {
      common: 1, rare: 3, epic: 8, legendary: 20,
    };
    const mul = qualityMul[item.quality] || 1;

    if (item.type === 'equipment') {
      const iLvl = (item.properties as any)?.itemLevel || item.level || 1;
      return Math.max(1, Math.floor(iLvl * mul));
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
