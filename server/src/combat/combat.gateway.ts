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
  /** sessionId -> session mode (avoids extra Redis read on every tap) */
  private sessionModes = new Map<string, string>();
  /** Per-dojo session auto-complete timers */
  private dojoTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private combatService: CombatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Universal rate limiter ─────────────────────────────

  /**
   * Check message rate for all socket events.
   * Returns true if the player was banned (caller should return immediately).
   */
  private async rateLimitCheck(client: Socket, telegramId: string): Promise<boolean> {
    try {
      const wasBanned = await this.combatService.checkMessageRate(telegramId);
      if (wasBanned) {
        const sessionId = this.userSessions.get(telegramId);
        if (sessionId) {
          this.stopCombatLoop(sessionId);
          this.stopDojoTimer(sessionId);
          this.sessionModes.delete(sessionId);
          try {
            await this.combatService.fleeCombat(telegramId, sessionId);
          } catch { /* session may already be gone */ }
          this.userSessions.delete(telegramId);
        }
        const banCheck = await this.combatService.isPlayerBanned(telegramId);
        client.emit('combat:banned', {
          expiresAt: banCheck.expiresAt,
          reason: 'rate_limit_exceeded',
        });
        return true;
      }
    } catch {
      // Swallow Redis failures — don't block gameplay
    }
    return false;
  }

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

      // Store on socket.data IMMEDIATELY (synchronous) so event handlers
      // that arrive before the async ban-check completes can still resolve the user
      // without polling. This eliminates the resolveUser retry loop.
      (client.data as { telegramId: string }).telegramId = telegramId;
      this.socketUsers.set(client.id, telegramId);
      this.userSockets.set(telegramId, client.id);

      // Check ban after storing mappings so that any rapid events during
      // the async lookup are still correctly attributed to this user.
      const banCheck = await this.combatService.isPlayerBanned(telegramId);
      if (banCheck.banned) {
        client.emit('combat:banned', {
          expiresAt: banCheck.expiresAt,
          reason: 'rate_limit_exceeded',
        });
        client.disconnect();
        return;
      }

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

    // Start grace period — if player doesn't reconnect, flee/complete
    const mode = this.sessionModes.get(sessionId);
    const timer = setTimeout(async () => {
      this.disconnectTimers.delete(telegramId);
      const sid = this.userSessions.get(telegramId);
      if (sid) {
        try {
          const sMode = this.sessionModes.get(sid);
          if (sMode === 'dojo') {
            // Save dojo score on disconnect
            await this.combatService.completeDojo(telegramId, sid);
          } else {
            await this.combatService.fleeCombat(telegramId, sid);
          }
        } catch {
          /* session may already be gone */
        }
        this.stopDojoTimer(sid);
        this.sessionModes.delete(sid);
        this.userSessions.delete(telegramId);
      }
      console.log(
        `[CombatGateway] Grace period expired for ${telegramId}, session ${mode === 'dojo' ? 'completed' : 'fled'}`,
      );
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(telegramId, timer);
    console.log(
      `[CombatGateway] Disconnected: ${client.id} (user ${telegramId}), grace ${DISCONNECT_GRACE_MS}ms`,
    );
  }

  /**
   * Resolve telegramId for a socket — O(1), no async, no polling.
   *
   * telegramId is written to client.data synchronously during handleConnection
   * right after JWT verification, before any async operations. This means
   * it is always available by the time any event handler runs.
   */
  private resolveUser(client: Socket): string | null {
    return (client.data as { telegramId?: string }).telegramId ?? null;
  }

  // ─── Start combat ─────────────────────────────────────────

  /**
   * Clean up any stale combat session for the given user.
   * Stops the loop and flees the old session so a new one can start.
   */
  private async cleanupStaleSession(telegramId: string): Promise<void> {
    const oldSessionId = this.userSessions.get(telegramId);
    if (!oldSessionId) return;

    this.stopCombatLoop(oldSessionId);
    this.stopDojoTimer(oldSessionId);
    this.sessionModes.delete(oldSessionId);
    try {
      await this.combatService.fleeCombat(telegramId, oldSessionId);
    } catch {
      /* session may already be gone */
    }
    this.userSessions.delete(telegramId);
  }

  @SubscribeMessage('combat:start-location')
  async handleStartLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { locationId: string; waves: any[]; order: number; act: number },
  ) {
    const telegramId = this.resolveUser(client);
    if (!telegramId) {
      client.emit('combat:error', { message: 'Auth not ready — please retry' });
      return;
    }

    if (await this.rateLimitCheck(client, telegramId)) return;

    // Ban check
    const banCheck = await this.combatService.isPlayerBanned(telegramId);
    if (banCheck.banned) {
      client.emit('combat:banned', { expiresAt: banCheck.expiresAt, reason: 'rate_limit_exceeded' });
      return;
    }

    try {
      // If the user already has an active session, re-send its state
      // (client retry after transport upgrade — the first response was lost)
      const existingSessionId = this.userSessions.get(telegramId);
      if (existingSessionId) {
        const existing = await this.combatService.getSession(existingSessionId);
        if (existing && existing.playerId === telegramId) {
          console.log(`[CombatGateway] Re-sending combat:started for existing session ${existingSessionId}`);
          const currentMonster = existing.monsterQueue[existing.currentIndex] || null;
          client.emit('combat:started', {
            sessionId: existingSessionId,
            totalMonsters: existing.monsterQueue.length,
            playerHp: existing.playerCurrentHp,
            playerMaxHp: existing.playerMaxHp,
            currentMonster,
          });
          return;
        }
        // Session exists in map but not in Redis — clean up
        this.sessionModes.delete(existingSessionId);
        this.userSessions.delete(telegramId);
      }

      const result = await this.combatService.startLocation(
        telegramId,
        data.locationId,
        data.waves,
        data.order,
        data.act,
      );

      this.userSessions.set(telegramId, result.sessionId);
      this.sessionModes.set(result.sessionId, 'location');
      // Combat loop deferred — starts when client sends combat:entrance-done

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
    const telegramId = this.resolveUser(client);
    if (!telegramId) {
      client.emit('combat:error', { message: 'Auth not ready — please retry' });
      return;
    }

    if (await this.rateLimitCheck(client, telegramId)) return;

    // Ban check
    const banCheck = await this.combatService.isPlayerBanned(telegramId);
    if (banCheck.banned) {
      client.emit('combat:banned', { expiresAt: banCheck.expiresAt, reason: 'rate_limit_exceeded' });
      return;
    }

    try {
      // If the user already has an active session, re-send its state
      const existingSessionId = this.userSessions.get(telegramId);
      if (existingSessionId) {
        const existing = await this.combatService.getSession(existingSessionId);
        if (existing && existing.playerId === telegramId) {
          console.log(`[CombatGateway] Re-sending combat:started for existing session ${existingSessionId}`);
          const currentMonster = existing.monsterQueue[existing.currentIndex] || null;
          client.emit('combat:started', {
            sessionId: existingSessionId,
            totalMonsters: existing.monsterQueue.length,
            playerHp: existing.playerCurrentHp,
            playerMaxHp: existing.playerMaxHp,
            currentMonster,
          });
          return;
        }
        this.sessionModes.delete(existingSessionId);
        this.userSessions.delete(telegramId);
      }

      const result = await this.combatService.startMapByDto(telegramId, {
        mapKeyItemId: data.mapKeyItemId,
        direction: data.direction,
      } as any);

      this.userSessions.set(telegramId, result.sessionId);
      this.sessionModes.set(result.sessionId, 'map');

      client.emit('combat:started', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to start map',
      });
    }
  }

  // ─── Start dojo ────────────────────────────────────────────

  @SubscribeMessage('combat:start-dojo')
  async handleStartDojo(
    @ConnectedSocket() client: Socket,
  ) {
    const telegramId = this.resolveUser(client);
    if (!telegramId) {
      client.emit('combat:error', { message: 'Auth not ready — please retry' });
      return;
    }

    if (await this.rateLimitCheck(client, telegramId)) return;

    const banCheck = await this.combatService.isPlayerBanned(telegramId);
    if (banCheck.banned) {
      client.emit('combat:banned', { expiresAt: banCheck.expiresAt, reason: 'rate_limit_exceeded' });
      return;
    }

    try {
      await this.cleanupStaleSession(telegramId);

      const result = await this.combatService.startDojo(telegramId);

      this.userSessions.set(telegramId, result.sessionId);
      this.sessionModes.set(result.sessionId, 'dojo');

      client.emit('combat:dojo-started', {
        sessionId: result.sessionId,
        dojoEndsAt: result.dojoEndsAt,
      });

      // Auto-complete timer: fires when dojo round ends
      const dojoTimer = setTimeout(async () => {
        this.dojoTimers.delete(result.sessionId);
        if (this.userSessions.get(telegramId) !== result.sessionId) return;

        try {
          const completionResult = await this.combatService.completeDojo(telegramId, result.sessionId);
          this.userSessions.delete(telegramId);
          this.sessionModes.delete(result.sessionId);

          const socketId = this.userSockets.get(telegramId);
          if (socketId) {
            this.server.to(socketId).emit('combat:dojo-completed', completionResult);
          }
        } catch { /* session already completed by client */ }
      }, B.DOJO_COUNTDOWN_MS + B.DOJO_ROUND_MS + 500);

      this.dojoTimers.set(result.sessionId, dojoTimer);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to start dojo',
      });
    }
  }

  // ─── Complete dojo ─────────────────────────────────────────

  @SubscribeMessage('combat:complete-dojo')
  async handleCompleteDojo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    if (await this.rateLimitCheck(client, telegramId)) return;

    try {
      this.stopDojoTimer(data.sessionId);
      const result = await this.combatService.completeDojo(telegramId, data.sessionId);
      this.userSessions.delete(telegramId);
      this.sessionModes.delete(data.sessionId);

      client.emit('combat:dojo-completed', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Failed to complete dojo',
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

    if (await this.rateLimitCheck(client, telegramId)) return;

    // Check session mode to route dojo vs combat
    const mode = this.sessionModes.get(data.sessionId);

    if (mode === 'dojo') {
      try {
        const dojoResult = await this.combatService.processDojoTap(
          telegramId,
          data.sessionId,
        );

        client.emit('combat:tap-result', dojoResult);

        // If dojo ended (timer expired), auto-complete
        if (dojoResult.dojoEnded) {
          this.stopDojoTimer(data.sessionId);
          try {
            const completionResult = await this.combatService.completeDojo(
              telegramId,
              data.sessionId,
            );
            this.userSessions.delete(telegramId);
            this.sessionModes.delete(data.sessionId);
            client.emit('combat:dojo-completed', completionResult);
          } catch { /* already completed */ }
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (!msg?.includes('Tap too fast')) {
          client.emit('combat:error', { message: msg || 'Tap failed' });
        }
      }
      return;
    }

    // Regular combat tap
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
        this.sessionModes.delete(data.sessionId);
      } else if (result.killed && !result.isComplete) {
        // Monster killed but wave continues — pause attacks until entrance-done
        this.stopCombatLoop(data.sessionId);
        console.log(`[CombatGateway] Monster killed — loop paused, waiting for entrance-done (session=${data.sessionId})`);
      }
    } catch (err) {
      const msg = (err as Error).message;
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

    if (await this.rateLimitCheck(client, telegramId)) return;

    try {
      this.stopCombatLoop(data.sessionId);
      const result = await this.combatService.completeSession(
        telegramId,
        data.sessionId,
      );
      this.userSessions.delete(telegramId);
      this.sessionModes.delete(data.sessionId);

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

    if (await this.rateLimitCheck(client, telegramId)) return;

    try {
      this.stopCombatLoop(data.sessionId);
      this.stopDojoTimer(data.sessionId);
      await this.combatService.fleeCombat(telegramId, data.sessionId);
      this.userSessions.delete(telegramId);
      this.sessionModes.delete(data.sessionId);

      client.emit('combat:fled', { success: true });
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Flee failed',
      });
    }
  }

  // ─── Entrance done (client ready for enemy attacks) ──────

  @SubscribeMessage('combat:entrance-done')
  async handleEntranceDone(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    if (await this.rateLimitCheck(client, telegramId)) return;

    const sessionId = data?.sessionId || this.userSessions.get(telegramId);
    if (!sessionId) return;

    // Only start if not already running (idempotent)
    if (this.combatLoops.has(sessionId)) {
      console.log(`[CombatGateway] entrance-done ignored — loop already running for ${sessionId}`);
      return;
    }

    // Reset lastEnemyAttackTime so first attack uses fresh timing
    try {
      const session = await this.combatService.getSession(sessionId);
      if (session && session.playerId === telegramId) {
        session.lastEnemyAttackTime = Date.now();
        await this.combatService.saveSession(sessionId, session);
        console.log(
          `[CombatGateway] entrance-done: starting loop for session=${sessionId}, ` +
          `monster #${session.currentIndex}, nextAttackIn=${session.nextAttackIn}ms`,
        );
      }
    } catch { /* non-critical */ }

    this.startCombatLoop(sessionId, telegramId);
  }

  // ─── Reconnect ────────────────────────────────────────────

  @SubscribeMessage('combat:reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    if (await this.rateLimitCheck(client, telegramId)) return;

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
      this.sessionModes.set(data.sessionId, session.mode);

      if (session.mode !== 'dojo') {
        this.startCombatLoop(data.sessionId, telegramId);
      }

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

  // ─── Potion usage ───────────────────────────────────────────

  @SubscribeMessage('combat:use-potion')
  async handleUsePotion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; slot: 'consumable-1' | 'consumable-2' },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    if (await this.rateLimitCheck(client, telegramId)) return;

    try {
      const result = await this.combatService.usePotion(
        telegramId,
        data.sessionId,
        data.slot,
      );
      client.emit('combat:potion-used', result);
    } catch (err) {
      client.emit('combat:error', {
        message: (err as Error).message || 'Potion failed',
      });
    }
  }

  // ─── Active skill cast ─────────────────────────────────────

  @SubscribeMessage('combat:cast-skill')
  async handleCastSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; skillId: string },
  ) {
    const telegramId = this.socketUsers.get(client.id);
    if (!telegramId) return;

    if (await this.rateLimitCheck(client, telegramId)) return;

    try {
      const result = await this.combatService.castSkill(
        telegramId,
        data.sessionId,
        data.skillId,
      );

      client.emit('combat:skill-result', result);

      if (result.playerDead) {
        this.stopCombatLoop(data.sessionId);
        try {
          await this.combatService.playerDeath(telegramId, data.sessionId);
        } catch { /* already handled */ }
        client.emit('combat:player-died', { sessionId: data.sessionId });
        this.userSessions.delete(telegramId);
        this.sessionModes.delete(data.sessionId);
      } else if (result.killed && !result.isComplete) {
        // Monster killed — pause attacks until entrance-done
        this.stopCombatLoop(data.sessionId);
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg?.includes('cooldown')) {
        client.emit('combat:error', { message: msg || 'Skill cast failed' });
      }
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
          this.sessionModes.delete(sessionId);
        }
      } catch (err) {
        console.error('[CombatGateway] Loop error:', err);
      }
    }, 200); // 200ms tick — supports per-attack speeds from 0.3s to 3s

    this.combatLoops.set(sessionId, interval);
  }

  private stopCombatLoop(sessionId: string): void {
    const interval = this.combatLoops.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.combatLoops.delete(sessionId);
    }
  }

  private stopDojoTimer(sessionId: string): void {
    const timer = this.dojoTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.dojoTimers.delete(sessionId);
    }
  }
}
