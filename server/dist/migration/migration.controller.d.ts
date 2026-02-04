import { MigrationService } from './migration.service';
import { ImportLocalDto } from './dto/import-local.dto';
export declare class MigrationController {
    private migrationService;
    constructor(migrationService: MigrationService);
    importLocal(telegramId: string, dto: ImportLocalDto): Promise<{
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
}
