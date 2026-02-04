import { Repository } from 'typeorm';
import { BagItem } from '../shared/entities/bag-item.entity';
import { Character } from '../shared/entities/character.entity';
export declare class LootService {
    private bagRepo;
    private charRepo;
    constructor(bagRepo: Repository<BagItem>, charRepo: Repository<Character>);
    getBag(telegramId: string, characterId: string): Promise<BagItem[]>;
    rollMapDrops(tier: number, isBossMap?: boolean, direction?: string | null): Partial<BagItem>[];
    private createMapKeyData;
    private createBossKeyData;
    addItemsToBag(characterId: string, items: Partial<BagItem>[]): Promise<BagItem[]>;
    removeItem(characterId: string, itemId: string): Promise<void>;
}
