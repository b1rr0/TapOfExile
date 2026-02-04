import { Module } from '@nestjs/common';
import { LevelGenService } from './level-gen.service';

@Module({
  providers: [LevelGenService],
  exports: [LevelGenService],
})
export class LevelGenModule {}
