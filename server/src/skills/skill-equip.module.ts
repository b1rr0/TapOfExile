import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character } from '../shared/entities/character.entity';
import { SkillEquipService } from './skill-equip.service';
import { SkillEquipController } from './skill-equip.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Character])],
  controllers: [SkillEquipController],
  providers: [SkillEquipService],
  exports: [SkillEquipService],
})
export class SkillEquipModule {}
