import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class EquipSkillDto {
  @IsString()
  characterId: string;

  @IsInt()
  @Min(0)
  @Max(3)
  slot: number;

  @IsString()
  skillId: string;
}

export class UnequipSkillDto {
  @IsString()
  characterId: string;

  @IsInt()
  @Min(0)
  @Max(3)
  slot: number;
}

export class SkillsQueryDto {
  @IsString()
  characterId: string;
}
