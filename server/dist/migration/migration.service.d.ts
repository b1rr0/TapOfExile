import { Repository } from 'typeorm';
import { Player } from '../shared/entities/player.entity';
import { Character } from '../shared/entities/character.entity';
import { BagItem } from '../shared/entities/bag-item.entity';
export declare class MigrationService {
    private playerRepo;
    private charRepo;
    private bagRepo;
    constructor(playerRepo: Repository<Player>, charRepo: Repository<Character>, bagRepo: Repository<BagItem>);
    importLocalSave(telegramId: string, gameData: any): Promise<{
        status: string;
        reason: string;
        serverTime: number;
        clientTime: any;
        charactersImported?: undefined;
        gold?: undefined;
        version?: undefined;
    } | {
        status: string;
        charactersImported: number;
        gold: string;
        version: number;
        reason?: undefined;
        serverTime?: undefined;
        clientTime?: undefined;
    }>;
    private migrateData;
    private validateGameData;
}
