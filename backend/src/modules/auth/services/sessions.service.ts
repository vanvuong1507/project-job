import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, MoreThan, type Repository } from 'typeorm';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import { AuthSessionEntity, type RevokeReason } from '../entities/auth-session.entity.js';
import {
  decodeRefreshToken,
  deriveRefreshKey,
  encodeRefreshToken,
} from '../utils/refresh-token.js';

/** Where a session was used from (audit columns). */
export interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

/** A session plus the refresh token that is valid for it right now. */
export interface IssuedSession {
  session: AuthSessionEntity;
  refreshToken: string;
}

/** Outcome of presenting a refresh token. */
export type RotateResult =
  | ({ status: 'ok' } & IssuedSession)
  /** Malformed, unknown, revoked or expired token. */
  | { status: 'invalid' }
  /** An already-rotated token was replayed: the session is now revoked (likely theft). */
  | { status: 'reused' };

/**
 * Refresh-token sessions with rotation and reuse detection (OAuth 2.0 Security BCP §4.14):
 * - every refresh issues the next generation and invalidates the previous one;
 * - the previous one is still honoured for REFRESH_REUSE_LEEWAY_SECONDS and then answers with the
 *   CURRENT token, so parallel requests (prefetches, two tabs) never log the user out;
 * - any older token presented later revokes the whole session (attacker and victim both lose it).
 * Rows are locked during a refresh, so concurrent refreshes are serialised.
 */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly key: Buffer;
  private readonly refreshTtlMs: number;
  private readonly sessionMaxMs: number;
  private readonly leewayMs: number;

  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly sessions: Repository<AuthSessionEntity>,
    private readonly dataSource: DataSource,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.key = deriveRefreshKey(config.auth.jwtSecret);
    this.refreshTtlMs = config.auth.refreshTokenTtlSeconds * 1000;
    this.sessionMaxMs = config.auth.sessionMaxSeconds * 1000;
    this.leewayMs = config.auth.refreshReuseLeewaySeconds * 1000;
  }

  /** A new session for a successful sign-in. Also prunes the user's dead sessions. */
  async create(userId: string, client: ClientInfo, now = new Date()): Promise<IssuedSession> {
    await this.prune(userId, now);
    const absoluteExpiresAt = new Date(now.getTime() + this.sessionMaxMs);
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        generation: 0,
        rotatedAt: null,
        expiresAt: this.slidingExpiry(now, absoluteExpiresAt),
        absoluteExpiresAt,
        revokedAt: null,
        revokedReason: null,
        ...clientColumns(client),
      }),
    );
    return { session, refreshToken: this.tokenFor(session) };
  }

  /** Exchanges a refresh token for the next one (see the class comment for the rules). */
  async rotate(token: unknown, client: ClientInfo, now = new Date()): Promise<RotateResult> {
    const claims = decodeRefreshToken(this.key, token);
    if (!claims) return { status: 'invalid' };

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AuthSessionEntity);
      const session = await repo.findOne({
        where: { id: claims.sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session || session.revokedAt) return { status: 'invalid' } as const;

      if (now >= session.expiresAt || now >= session.absoluteExpiresAt) {
        await this.markRevoked(repo, session, 'expired', now);
        return { status: 'invalid' } as const;
      }

      if (claims.generation === session.generation) {
        session.generation += 1;
        session.rotatedAt = now;
        session.expiresAt = this.slidingExpiry(now, session.absoluteExpiresAt);
        Object.assign(session, clientColumns(client));
        await repo.save(session);
        return { status: 'ok', session } as const;
      }

      const justRotated =
        claims.generation === session.generation - 1 &&
        session.rotatedAt !== null &&
        now.getTime() - session.rotatedAt.getTime() <= this.leewayMs;
      if (justRotated) return { status: 'ok', session } as const; // same answer as the winner got

      // An older generation (or a forged future one, which the HMAC already rules out).
      await this.markRevoked(repo, session, 'reuse', now);
      return { status: 'reused', session } as const;
    });

    if (result.status === 'reused') {
      this.logger.warn(
        `Refresh token reuse detected: session ${result.session.id} (user ${result.session.userId}) revoked`,
      );
      return { status: 'reused' };
    }
    if (result.status === 'invalid') return result;
    return { status: 'ok', session: result.session, refreshToken: this.tokenFor(result.session) };
  }

  /** The session id behind a refresh token, if the token is authentic (logout). */
  sessionIdOf(token: unknown): string | null {
    return decodeRefreshToken(this.key, token)?.sessionId ?? null;
  }

  /** Revokes a session (idempotent). */
  async revoke(sessionId: string, reason: RevokeReason, now = new Date()): Promise<void> {
    await this.sessions.update(
      { id: sessionId, revokedAt: IsNull() },
      { revokedAt: now, revokedReason: reason },
    );
  }

  /** Whether an access token's session still allows requests. */
  async isActive(sessionId: string, userId: string, now = new Date()): Promise<boolean> {
    return this.sessions.exists({
      where: {
        id: sessionId,
        userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
        absoluteExpiresAt: MoreThan(now),
      },
    });
  }

  private tokenFor(session: AuthSessionEntity): string {
    return encodeRefreshToken(this.key, {
      sessionId: session.id,
      generation: session.generation,
    });
  }

  private slidingExpiry(now: Date, absoluteExpiresAt: Date): Date {
    return new Date(Math.min(now.getTime() + this.refreshTtlMs, absoluteExpiresAt.getTime()));
  }

  private async markRevoked(
    repo: Repository<AuthSessionEntity>,
    session: AuthSessionEntity,
    reason: RevokeReason,
    now: Date,
  ): Promise<void> {
    session.revokedAt = now;
    session.revokedReason = reason;
    await repo.save(session);
  }

  /** Deletes the user's expired sessions and those revoked more than a day ago (kept briefly for audit). */
  private async prune(userId: string, now: Date): Promise<void> {
    const dayAgo = new Date(now.getTime() - 86_400_000);
    await this.sessions
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .andWhere('(expires_at <= :now OR absolute_expires_at <= :now OR revoked_at <= :dayAgo)', {
        now,
        dayAgo,
      })
      .execute();
  }
}

function clientColumns({ ip, userAgent }: ClientInfo) {
  return { lastIp: ip?.slice(0, 64) ?? null, userAgent: userAgent?.slice(0, 255) ?? null };
}
