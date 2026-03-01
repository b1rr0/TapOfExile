import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from '../shared/entities/character.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';
import { validateAllocations } from '@shared/skill-tree-validation';
import { buildSkillTree } from '@shared/skill-tree';

@Injectable()
export class SkillTreeService {
  constructor(
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
    @InjectRepository(PlayerLeague)
    private playerLeagueRepo: Repository<PlayerLeague>,
  ) {}

  /**
   * Get allocated node IDs for a character.
   */
  async getAllocations(
    telegramId: string,
    characterId: string,
  ): Promise<{ allocated: number[] }> {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    return { allocated: char.allocatedNodes || [] };
  }

  /**
   * Accept (bulk save) skill allocations.
   * Replaces the entire allocated array.
   *
   * Full validation using shared validator:
   * - Start node must be allocated
   * - All IDs valid
   * - All nodes connected to start via BFS
   * - Points budget: outer nodes <= level - 1, class skills <= MAX_CLASS_SKILLS
   */
  async acceptAllocations(
    telegramId: string,
    characterId: string,
    allocated: number[],
  ): Promise<{ allocated: number[] }> {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    // Basic type validation
    if (!Array.isArray(allocated)) {
      throw new BadRequestException('allocated must be an array');
    }

    for (const id of allocated) {
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
        throw new BadRequestException('allocated must contain non-negative integers');
      }
    }

    // Full graph validation using shared validator
    const result = validateAllocations(char.classId, char.level, allocated);
    if (!result.valid) {
      throw new BadRequestException(
        `Invalid allocations: ${result.errors.join('; ')}`,
      );
    }

    // Deduplicate and save
    const unique = [...new Set(allocated)];
    char.allocatedNodes = unique;

    // Sync unlocked active skills from allocated activeSkill nodes
    const tree = buildSkillTree();
    const newUnlocked: string[] = [];
    for (const nodeId of unique) {
      const node = tree.nodes[nodeId];
      if (node && node.type === 'activeSkill' && node.def?.activeSkillId) {
        newUnlocked.push(node.def.activeSkillId);
      }
    }
    char.unlockedActiveSkills = newUnlocked;

    // Clean up equipped skills — remove any that are no longer unlocked
    const unlockedSet = new Set(newUnlocked);
    const equipped: (string | null)[] = [...(char.equippedSkills || [null, null, null, null])];
    while (equipped.length < 4) equipped.push(null);
    for (let i = 0; i < equipped.length; i++) {
      if (equipped[i] && !unlockedSet.has(equipped[i]!)) equipped[i] = null;
    }

    // Auto-equip newly unlocked skills into empty slots
    const alreadyEquipped = new Set(equipped.filter(Boolean));
    for (const skillId of newUnlocked) {
      if (alreadyEquipped.has(skillId)) continue;
      const emptySlot = equipped.indexOf(null);
      if (emptySlot === -1) break; // all slots full
      equipped[emptySlot] = skillId;
      alreadyEquipped.add(skillId);
    }

    char.equippedSkills = equipped;

    await this.charRepo.save(char);

    return { allocated: unique };
  }

  /**
   * Reset all allocations (costs gold from active league's PlayerLeague).
   */
  async resetAllocations(
    telegramId: string,
    characterId: string,
  ): Promise<{ cost: number; allocated: number[] }> {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');

    const pl = await this.playerLeagueRepo.findOne({
      where: { id: char.playerLeagueId },
    });
    if (!pl) throw new NotFoundException('PlayerLeague not found');

    // Reset cost: 100 gold per allocated node
    const nodeCount = (char.allocatedNodes || []).length;
    const cost = nodeCount * 100;

    if (BigInt(pl.gold) < BigInt(cost)) {
      throw new BadRequestException('Not enough gold');
    }

    pl.gold = String(BigInt(pl.gold) - BigInt(cost));
    await this.playerLeagueRepo.save(pl);

    char.allocatedNodes = [];
    char.unlockedActiveSkills = [];
    char.equippedSkills = [null, null, null, null];
    await this.charRepo.save(char);

    return { cost, allocated: [] };
  }
}
