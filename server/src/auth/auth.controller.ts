import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Authenticate via Telegram initData' })
  async authenticateTelegram(@Body() dto: TelegramAuthDto) {
    return this.authService.authenticateTelegram(dto.initData);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Get('check-channel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check if user is subscribed to the Telegram channel' })
  async checkChannel(@Request() req: any) {
    return this.authService.checkChannelMembership(req.user.telegramId);
  }
}
