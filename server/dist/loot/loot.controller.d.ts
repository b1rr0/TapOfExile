import { LootService } from './loot.service';
export declare class LootController {
    private lootService;
    constructor(lootService: LootService);
    getBag(telegramId: string, characterId: string): Promise<import("../shared/entities/bag-item.entity").BagItem[]>;
    discardItem(characterId: string, itemId: string): Promise<{
        success: boolean;
    }>;
}
