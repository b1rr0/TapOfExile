import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { Player } from '../../shared/entities/player.entity';

/** Debounce interval - update DB at most once per player per 60s */
const DEBOUNCE_MS = 60_000;

/**
 * Global interceptor that updates Player.lastSeenAt on every
 * authenticated request. Uses in-memory debounce map so each
 * player triggers at most 1 DB write per DEBOUNCE_MS.
 */
@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  private lastWritten = new Map<string, number>();

  constructor(
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (user?.telegramId) {
      this.touchLastSeen(user.telegramId);
    }

    return next.handle();
  }

  private touchLastSeen(telegramId: string): void {
    const now = Date.now();
    const last = this.lastWritten.get(telegramId) || 0;

    if (now - last < DEBOUNCE_MS) return; // skip, too recent

    this.lastWritten.set(telegramId, now);

    // Fire-and-forget DB update
    this.playerRepo
      .update(telegramId, { lastSeenAt: new Date(now) })
      .catch(() => {}); // swallow errors silently
  }
}
