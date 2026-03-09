import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Authenticate via Telegram initData' })
  @ApiResponse({ status: 201, description: 'JWT tokens + player info' })
  @ApiResponse({ status: 401, description: 'Invalid or expired initData' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async authenticateTelegram(@Body() dto: TelegramAuthDto) {
    return this.authService.authenticateTelegram(dto.initData, dto.startParam);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 201, description: 'New access token' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Get('check-channel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user is subscribed to the Telegram channel' })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkChannel(@CurrentUser('telegramId') telegramId: string) {
    return this.authService.checkChannelMembership(telegramId);
  }
}
