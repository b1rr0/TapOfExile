import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { Friendship } from '../shared/entities/friendship.entity';
import { Character } from '../shared/entities/character.entity';
import { EquipmentSlot } from '../shared/entities/equipment-slot.entity';
import { DojoRecord } from '../shared/entities/dojo-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship, Character, EquipmentSlot, DojoRecord])],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
