import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CombatService } from './combat.service';
import { B } from '../shared/constants/balance.constants';

const DISCONNECT_GRACE_MS = 30_000; // 30 seconds to reconnect

@WebSocketGateway({
  namespace: '/combat',
  cors: { origin: true, credentials: true },
})
export class CombatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** Per-session combat loop intervals */
  private combatLoops = new Map<string, ReturnType<typeof setInterval>>();
  /** Disconnect grace timers: telegramId -> timeout */
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** socketId -> telegramId */
  private socketUsers = new Map<string, string>();
  /** telegramId -> socketId */
  private userSockets = new Map<string, string>();
  /** telegramId -> sessionId */
  private userSessions = new Map<string, string>();

  constructor(
    private combatService: CombatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Connection lifecycle ─────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'default_secret',
      );
      const payload = this.jwtService.verify(token, { secret });

      if (payload.type !== 'access' || !payload.sub) {
        client.disconnect();
        return;
      }

      const telegramId: string = payload.sub;

      // Map socket <-> user
      this.socketUsers.set(client.id, telegramId);
      this.userSockets.set(telegramId, client.id);

      // Cancel any pending disconnect grace timer
      const existingTimer = this.disconnectTimers.get(telegramId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectTimers.delete(telegramId);
      }

      console.log(
        `[CombatGateway] Connected: ${client.id} (user ${telegramId})`,
      );
    } catch (err) {
      console.warn('[CombatGateway] Auth failed:', (err as Error).message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const telegramId = this.socketUsers.get(client.id);
    this.socketUsers.delete(client.id);

    if (!telegramId) return;

    // Only clean up if this is still the active socket for this user
    if (this.userSockets.get(telegramId) !== client.id) return;
    this.userSockets.delete(telegramId);

    const sessionId = this.userSessions.get(telegramId);
    if (!sessionId) return;

    // Pause combat loop
    this.stopCombatLoop(sessionId);

    // Start grace period — if player doesn't reconnect, flee
    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(telegramId);
      const sid = this.userSessions.get(telegramId);
      if (sid) {
        try {
          await this.combatService.fleeCombat(telegramId, sid);
        } catch {
          /* session may already be gone */
        }
        this.userSessions.delete(telegramId);
      }
      console.log(
        `[CombatGateway] Grace period expired for ${telegramId}, session fled`,
      );
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(telegramId, timer);
    console.log(
      `[CombatGateway] Disconnected: ${client.id} (user ${telegramId}), grace ${DISCONNECT_GRACE_MS}ms`,
    );
  }

  // ─── Start combat ─────────────────────────────────────────

  @SubscribeMessage('combat:start-location')
  async handleStartLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { locationId: string; waves: any[]; order: number; act: number },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      const result = await this.combatService.startLocation(
        telegramId,
        data.locationId,
        data.waves,
        data.order,
        data.act,
      );

      this.userSessions.set(telegramId, result.sessionId);
      this.startCombatLoop(result.sessionId, telegramId);

      client.emit('combat:started', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to start location',
      });
    }
  }

  @SubscribeMessage('combat:start-map')
  async handleStartMap(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mapKeyItemId: string; direction?: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      const result = await this.combatService.startMapByDto(telegramId, {
        mapKeyItemId: data.mapKeyItemId,
        direction: data.direction,
      } as any);

      this.userSessions.set(telegramId, result.sessionId);
      this.startCombatLoop(result.sessionId, telegramId);

      client.emit('combat:started', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to start map',
      });
    }
  }

  // ─── Tap ──────────────────────────────────────────────────

  @SubscribeMessage('combat:tap')
  async handleTap(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      const result = await this.combatService.processTap(
        telegramId,
        data.sessionId,
      );

      client.emit('combat:tap-result', result);

      if (result.playerDead) {
        this.stopCombatLoop(data.sessionId);
        try {
          await this.combatService.playerDeath(telegramId, data.sessionId);
        } catch { /* already handled */ }
        client.emit('combat:player-died', { sessionId: data.sessionId });
        this.userSessions.delete(telegramId);
      }
    } catch (err) {
      const msg = (err as Error).message;
      // Don't spam errors for "tap too fast"
      if (!msg?.includes('Tap too fast')) {
        client.emit('combat:error', { message: msg || 'Tap failed' });
      }
    }
  }

  // ─── Complete ─────────────────────────────────────────────

  @SubscribeMessage('combat:complete')
  async handleComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      this.stopCombatLoop(data.sessionId);
      const result = await this.combatService.completeSession(
        telegramId,
        data.sessionId,
      );
      this.userSessions.delete(telegramId);

      client.emit('combat:completed', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to complete',
      });
    }
  }

  // ─── Flee ─────────────────────────────────────────────────

  @SubscribeMessage('combat:flee')
  async handleFlee(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      this.stopCombatLoop(data.sessionId);
      await this.combatService.fleeCombat(telegramId, data.sessionId);
      this.userSessions.delete(telegramId);

      client.emit('combat:fled', { success: true });
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Flee failed',
      });
    }
  }

  // ─── Reconnect ────────────────────────────────────────────

  @SubscribeMessage('combat:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    try {
      // Cancel disconnect grace timer
      const timer = this.disconnectTimers.get(telegramId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(telegramId);
      }

      // Verify session exists and belongs to this user
      const session = await this.combatService.getSession(data.sessionId);
      if (!session || session.playerId !== telegramId) {
        client.emit('combat:error', { message: 'Session not found or expired' });
        return;
      }

      // Forgive missed attacks during disconnect
      session.lastEnemyAttackTime = Date.now();
      await this.combatService.saveSession(data.sessionId, session);

      // Restore user-session mapping and restart loop
      this.userSessions.set(telegramId, data.sessionId);
      this.startCombatLoop(data.sessionId, telegramId);

      const currentMonster = session.monsterQueue[session.currentIndex] || null;

      client.emit('combat:reconnected', {
        sessionId: data.sessionId,
        currentMonster,
        playerHp: session.playerCurrentHp,
        playerMaxHp: session.playerMaxHp,
        monstersRemaining:
          session.monsterQueue.length - session.currentIndex,
        totalMonsters: session.monsterQueue.length,
      });

      console.log(
        `[CombatGateway] Reconnected: ${telegramId} to session ${data.sessionId}`,
      );
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Reconnect failed',
      });
    }
  }

  // ─── Combat loop ──────────────────────────────────────────

  private startCombatLoop(sessionId: string, telegramId: string): void {
    // Clear any existing loop for this session
    this.stopCombatLoop(sessionId);

    const interval = setInterval(async () => {
      try {
        const result =
          await this.combatService.processEnemyTick(sessionId);

        if (!result) {
          // Session gone (expired or cleaned up)
          this.stopCombatLoop(sessionId);
          return;
        }

        const socketId = this.userSockets.get(telegramId);
        if (!socketId) return; // User disconnected — loop will be stopped by handleDisconnect

        if (result.attacks.length > 0 || result.playerDead) {
          this.server.to(socketId).emit('combat:enemy-attack', {
            attacks: result.attacks,
            playerHp: result.playerHp,
            playerMaxHp: result.playerMaxHp,
            playerDead: result.playerDead,
          });
        }

        if (result.playerDead) {
          this.stopCombatLoop(sessionId);
          try {
            await this.combatService.playerDeath(telegramId, sessionId);
          } catch { /* already handled */ }
          this.server.to(socketId).emit('combat:player-died', { sessionId });
          this.userSessions.delete(telegramId);
        }
      } catch (err) {
        console.error('[CombatGateway] Loop error:', err);
      }
    }, B.ENEMY_ATTACK_INTERVAL_MS);

    this.combatLoops.set(sessionId, interval);
  }

  private stopCombatLoop(sessionId: string): void {
    const interval = this.combatLoops.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.combatLoops.delete(sessionId);
    }
  }
}
