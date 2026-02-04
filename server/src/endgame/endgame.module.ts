import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EndgameController } from './endgame.controller';
import { EndgameService } from './endgame.service';
import { Character } from '../shared/entities/character.entity';
import { LootModule } from '../loot/loot.module';

@Module({
  imports: [TypeOrmModule.forFeature([Character]), LootModule],
  controllers: [EndgameController],
  providers: [EndgameService],
  exports: [EndgameService],
})
export class EndgameModule {}
