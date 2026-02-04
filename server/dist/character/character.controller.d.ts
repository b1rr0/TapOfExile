import { CharacterService } from './character.service';
import { CreateCharacterDto } from './dto/create-character.dto';
export declare class CharacterController {
    private characterService;
    constructor(characterService: CharacterService);
    listCharacters(telegramId: string): Promise<import("../shared/entities/character.entity").Character[]>;
    createCharacter(telegramId: string, dto: CreateCharacterDto): Promise<import("../shared/entities/character.entity").Character>;
    getCharacter(telegramId: string, charId: string): Promise<import("../shared/entities/character.entity").Character>;
    activateCharacter(telegramId: string, charId: string): Promise<import("../shared/entities/character.entity").Character>;
    changeSkin(telegramId: string, charId: string, skinId: string): Promise<import("../shared/entities/character.entity").Character>;
}
