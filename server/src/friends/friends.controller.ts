import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get('search')
  async searchCharacters(
    @CurrentUser('telegramId') telegramId: string,
    @Query('q') query: string,
  ) {
    return this.friendsService.searchCharacters(telegramId, query);
  }

  @Post('request')
  async sendRequest(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: { fromCharacterId: string; toCharacterId: string },
  ) {
    return this.friendsService.sendRequest(
      telegramId,
      body.fromCharacterId,
      body.toCharacterId,
    );
  }

  @Get('requests')
  async getIncomingRequests(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.friendsService.getIncomingRequests(telegramId, characterId);
  }

  @Post('respond')
  async respondToRequest(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: { friendshipId: string; accept: boolean },
  ) {
    return this.friendsService.respondToRequest(
      telegramId,
      body.friendshipId,
      body.accept,
    );
  }

  @Get('dojo-leaderboard')
  async getDojoLeaderboard(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.friendsService.getDojoLeaderboard(telegramId, characterId);
  }

  @Get('dojo-global')
  async getGlobalLeaderboard(
    @Query('characterId') characterId: string,
  ) {
    return this.friendsService.getGlobalLeaderboard(characterId);
  }

  @Post('dojo')
  async submitDojo(
    @CurrentUser('telegramId') telegramId: string,
    @Body() body: { characterId: string; totalDamage: number },
  ) {
    return this.friendsService.submitDojo(
      telegramId,
      body.characterId,
      body.totalDamage,
    );
  }

  @Get(':characterId/equipment')
  async getFriendEquipment(
    @CurrentUser('telegramId') telegramId: string,
    @Param('characterId') friendCharacterId: string,
    @Query('myCharacterId') myCharacterId: string,
  ) {
    return this.friendsService.getFriendEquipment(
      telegramId,
      myCharacterId,
      friendCharacterId,
    );
  }

  @Get()
  async listFriends(
    @CurrentUser('telegramId') telegramId: string,
    @Query('characterId') characterId: string,
  ) {
    return this.friendsService.listFriends(telegramId, characterId);
  }

  @Delete(':friendshipId')
  async removeFriend(
    @CurrentUser('telegramId') telegramId: string,
    @Param('friendshipId') friendshipId: string,
  ) {
    await this.friendsService.removeFriend(telegramId, friendshipId);
  }
}
