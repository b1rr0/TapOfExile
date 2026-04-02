import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character } from '../shared/entities/character.entity';
import { ACTIVE_SKILLS, CLASS_ACTIVE_SKILLS } from '@shared/active-skills';
import type { ActiveSkillId, ClassId } from '@shared/active-skills';

const MAX_SLOTS = 4;

@Injectable()
export class SkillEquipService {
  constructor(
    @InjectRepository(Character)
    private charRepo: Repository<Character>,
  ) {}

  /**
   * Get equipped skills (4-slot loadout) + available (unlocked) skills.
   */
  async getEquipped(
    telegramId: string,
    characterId: string,
  ): Promise<{
    equipped: (string | null)[];
    unlocked: string[];
    classSkills: string[];
  }> {
    const char = await this.findChar(telegramId, characterId);
    const classId = char.classId as ClassId;
    return {
      equipped: char.equippedSkills || [null, null, null, null],
      unlocked: char.unlockedActiveSkills || [],
      classSkills: CLASS_ACTIVE_SKILLS[classId] || [],
    };
  }

  /**
   * Equip a skill into a slot (0-3).
   * Validates: skill is unlocked, matches class, not already in another slot.
   */
  async equipSkill(
    telegramId: string,
    characterId: string,
    slot: number,
    skillId: string,
  ): Promise<{ equipped: (string | null)[] }> {
    const char = await this.findChar(telegramId, characterId);

    // Validate skill exists
    const skillDef = ACTIVE_SKILLS[skillId as ActiveSkillId];
    if (!skillDef) throw new BadRequestException(`Unknown skill: ${skillId}`);

    // Validate class restriction
    if (skillDef.classRestriction && skillDef.classRestriction !== char.classId) {
      throw new BadRequestException(`Skill ${skillId} is not available for class ${char.classId}`);
    }

    // Validate unlocked
    const unlocked = char.unlockedActiveSkills || [];
    if (!unlocked.includes(skillId)) {
      throw new BadRequestException(`Skill ${skillId} is not unlocked`);
    }

    // Validate slot
    if (slot < 0 || slot >= MAX_SLOTS) {
      throw new BadRequestException(`Invalid slot: ${slot}`);
    }

    // Remove skill from any other slot (prevent duplicates)
    const equipped = [...(char.equippedSkills || [null, null, null, null])];
    while (equipped.length < MAX_SLOTS) equipped.push(null);
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (equipped[i] === skillId) equipped[i] = null;
    }

    // Place in target slot
    equipped[slot] = skillId;

    char.equippedSkills = equipped;
    await this.charRepo.save(char);

    return { equipped };
  }

  /**
   * Unequip a slot.
   */
  async unequipSkill(
    telegramId: string,
    characterId: string,
    slot: number,
  ): Promise<{ equipped: (string | null)[] }> {
    const char = await this.findChar(telegramId, characterId);

    if (slot < 0 || slot >= MAX_SLOTS) {
      throw new BadRequestException(`Invalid slot: ${slot}`);
    }

    const equipped = [...(char.equippedSkills || [null, null, null, null])];
    while (equipped.length < MAX_SLOTS) equipped.push(null);
    equipped[slot] = null;

    char.equippedSkills = equipped;
    await this.charRepo.save(char);

    return { equipped };
  }

  private async findChar(telegramId: string, characterId: string): Promise<Character> {
    const char = await this.charRepo.findOne({
      where: { id: characterId, playerTelegramId: telegramId },
    });
    if (!char) throw new NotFoundException('Character not found');
    return char;
  }
}
