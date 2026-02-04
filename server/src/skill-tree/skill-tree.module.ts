import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillTreeController } from './skill-tree.controller';
import { SkillTreeService } from './skill-tree.service';
import { Character } from '../shared/entities/character.entity';
import { PlayerLeague } from '../shared/entities/player-league.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Character, PlayerLeague])],
  controllers: [SkillTreeController],
  providers: [SkillTreeService],
  exports: [SkillTreeService],
})
export class SkillTreeModule {}
