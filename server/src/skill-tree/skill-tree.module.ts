import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillTreeController } from './skill-tree.controller';
import { SkillTreeService } from './skill-tree.service';
import { SkillAllocation } from '../shared/entities/skill-allocation.entity';
import { Character } from '../shared/entities/character.entity';
import { Player } from '../shared/entities/player.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SkillAllocation, Character, Player, PlayerLeague])],
  controllers: [SkillTreeController],
  providers: [SkillTreeService],
  exports: [SkillTreeService],
})
export class SkillTreeModule {}
