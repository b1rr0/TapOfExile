import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from '../shared/entities/character.entity';
import { LootService } from '../loot/loot.service';
import { B } from '../shared/constants/balance.constants';

const TOTAL_ACTS = 5;

@Injectable()
export class EndgameService {
  constructor(
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    private lootService: LootService,
  ) {}

  async getStatus(telegramId: string, characterId: string) {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    return {
      unlocked: char.endgameUnlocked,
      completedBosses: char.completedBosses,
      highestTierCompleted: char.highestTierCompleted,
      totalMapsRun: char.totalMapsRun,
    };
  }

  /**
   * Check if endgame should be unlocked (all acts completed).
   */
  async checkUnlock(telegramId: string, characterId: string) {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    if (char.endgameUnlocked) {
      return { unlocked: true, alreadyUnlocked: true };
    }

    // Check if all main chain locations are completed
    // Main chain = orders 1-8 for each act
    const completed = new Set(char.completedLocations);
    let allComplete = true;

    for (let act = 1; act <= TOTAL_ACTS; act++) {
      for (let order = 1; order <= 8; order++) {
        const prefix = `act${act}_`;
        const hasAnyForOrder = char.completedLocations.some(
          (loc) => loc.startsWith(prefix),
        );
        if (!hasAnyForOrder && order <= 8) {
          // Simplified check: at least 8 locations per act
        }
      }
    }

    // Count completed locations per act
    for (let act = 1; act <= TOTAL_ACTS; act++) {
      const prefix = `act${act}_`;
      const actLocations = char.completedLocations.filter((l) =>
        l.startsWith(prefix),
      );
      if (actLocations.length < 8) {
        allComplete = false;
        break;
      }
    }

    if (!allComplete) {
      return { unlocked: false };
    }

    // Unlock endgame
    char.endgameUnlocked = true;
    await this.charRepo.save(char);

    // Grant starter keys
    const starterKeys: Array<Record<string, unknown>> = [];
    for (let i = 0; i < B.ENDGAME_STARTER_KEYS; i++) {
      starterKeys.push({
        id: `map_t${B.ENDGAME_STARTER_TIER}_starter_${Date.now()}_${i}`,
        name: `Starter Map Key`,
        type: 'map_key',
        tier: B.ENDGAME_STARTER_TIER,
        quality: 'common',
        level: B.ENDGAME_STARTER_TIER,
        icon: '\uD83D\uDDFA\uFE0F',
        acquiredAt: String(Date.now()),
      });
    }
    await this.lootService.addItemsToBag(characterId, starterKeys);

    return {
      unlocked: true,
      alreadyUnlocked: false,
      starterKeys: starterKeys.length,
    };
  }

  /**
   * Record a boss completion.
   */
  async recordBossCompletion(
    characterId: string,
    bossId: string,
    mapTier: number,
  ) {
    const char = await this.charRepo.findOne({
      where: { id: characterId },
    });
    if (!char) return;

    if (!char.completedBosses.includes(bossId)) {
      char.completedBosses = [...char.completedBosses, bossId];
    }
    if (mapTier > char.highestTierCompleted) {
      char.highestTierCompleted = mapTier;
    }
    char.totalMapsRun++;
    await this.charRepo.save(char);
  }
}
