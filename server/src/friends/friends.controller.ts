import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { FriendsService } from './friends.service';
import { SendRequestDto, RespondRequestDto } from './dto/friends.dto';
import { CharacterIdQueryDto } from '../shared/dto/character-id-query.dto';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search characters by nickname' })
  @ApiResponse({ status: 200, description: 'Matching characters (max 20)' })
  async searchCharacters(
    @CurrentUser('telegramId') telegramId: string,
    @Query('q') query: string,
  ) {
    return this.friendsService.searchCharacters(telegramId, query || '');
  }

  @Post('request')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent' })
  @ApiResponse({ status: 400, description: 'Already friends or request pending' })
  async sendRequest(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: SendRequestDto,
  ) {
    return this.friendsService.sendRequest(
      telegramId,
      dto.fromCharacterId,
      dto.toCharacterId,
    );
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get incoming friend requests' })
  @ApiResponse({ status: 200, description: 'Pending incoming requests' })
  async getIncomingRequests(
    @CurrentUser('telegramId') telegramId: string,
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.friendsService.getIncomingRequests(telegramId, query.characterId);
  }

  @Post('respond')
  @ApiOperation({ summary: 'Accept or reject a friend request' })
  @ApiResponse({ status: 201, description: 'Request accepted/rejected' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async respondToRequest(
    @CurrentUser('telegramId') telegramId: string,
    @Body() dto: RespondRequestDto,
  ) {
    return this.friendsService.respondToRequest(
      telegramId,
      dto.friendshipId,
      dto.accept,
    );
  }

  @Get('dojo-leaderboard')
  @ApiOperation({ summary: 'Friends dojo leaderboard' })
  @ApiResponse({ status: 200, description: 'Ranked friends dojo leaderboard' })
  async getDojoLeaderboard(
    @CurrentUser('telegramId') telegramId: string,
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.friendsService.getDojoLeaderboard(telegramId, query.characterId);
  }

  @Get('dojo-global')
  @ApiOperation({ summary: 'Global dojo leaderboard' })
  @ApiResponse({ status: 200, description: 'Ranked global dojo leaderboard' })
  async getGlobalLeaderboard(
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.friendsService.getGlobalLeaderboard(query.characterId);
  }

  @Get(':characterId/equipment')
  @ApiOperation({ summary: 'Get friend character equipment' })
  @ApiResponse({ status: 200, description: 'Friend character stats and equipment' })
  @ApiResponse({ status: 403, description: 'Not friends with this character' })
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
  @ApiOperation({ summary: 'List accepted friends' })
  @ApiResponse({ status: 200, description: 'Friends list with online status' })
  async listFriends(
    @CurrentUser('telegramId') telegramId: string,
    @Query() query: CharacterIdQueryDto,
  ) {
    return this.friendsService.listFriends(telegramId, query.characterId);
  }

  @Delete(':friendshipId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a friendship' })
  @ApiResponse({ status: 204, description: 'Friendship removed' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async removeFriend(
    @CurrentUser('telegramId') telegramId: string,
    @Param('friendshipId') friendshipId: string,
  ) {
    await this.friendsService.removeFriend(telegramId, friendshipId);
  }
}
