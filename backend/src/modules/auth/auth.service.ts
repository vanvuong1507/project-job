import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import type { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { AdminUserEntity } from './entities/admin-user.entity.js';
import type { AdminUser, LoginInput } from './dto/auth.dto.js';
import { LoginAttemptsService } from './services/login-attempts.service.js';
import {
  type ClientInfo,
  type IssuedSession,
  SessionsService,
} from './services/sessions.service.js';
import { DUMMY_HASH, verifyPassword } from './utils/password.js';
import type { Role } from './permissions.js';

const ALGORITHM = 'HS256';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a sign-in or a refresh hands out. Lifetimes in seconds (cookie Max-Age). */
export interface AuthTokens {
  accessToken: string;
  accessTokenMaxAge: number;
  refreshToken: string;
  refreshTokenMaxAge: number;
}

export interface AuthResult {
  user: AdminUser;
  tokens: AuthTokens;
}

/**
 * Credentials → session (access + refresh token), refresh → rotated tokens, access token → user.
 *
 * Access token: HS256 JWT, `sub` = user id, `role` (read without a DB hit by the admin app's proxy),
 * `sid` = session id, lifetime ACCESS_TOKEN_TTL_MINUTES. The admin app verifies it with the same
 * secret (its AUTH_SECRET = our JWT_SECRET). Here every request also checks that the session is still
 * active and re-reads the user, so logout, reuse detection and role changes apply immediately.
 * Refresh token: see SessionsService.
 */
@Injectable()
export class AuthService {
  private readonly key: Uint8Array;
  private readonly accessTtlSeconds: number;

  constructor(
    @InjectRepository(AdminUserEntity) private readonly users: Repository<AdminUserEntity>,
    private readonly attempts: LoginAttemptsService,
    private readonly sessions: SessionsService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.key = new TextEncoder().encode(config.auth.jwtSecret);
    this.accessTtlSeconds = config.auth.accessTokenTtlSeconds;
  }

  /** Checks credentials; the same error (and timing) for an unknown email and a wrong password. */
  async login({ email, password }: LoginInput, client: ClientInfo): Promise<AuthResult> {
    const normalised = email.toLowerCase();
    const ip = client.ip ?? 'unknown';
    this.attempts.assertAllowed(normalised, ip);

    const user = await this.users.findOneBy({ email: normalised });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      this.attempts.recordFailure(normalised, ip);
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    this.attempts.recordSuccess(normalised, ip);
    return this.issue(user, await this.sessions.create(user.id, client));
  }

  /** Rotates a refresh token. 401 INVALID_REFRESH_TOKEN / REFRESH_TOKEN_REUSED otherwise. */
  async refresh(refreshToken: unknown, client: ClientInfo): Promise<AuthResult> {
    const result = await this.sessions.rotate(refreshToken, client);
    if (result.status === 'reused') {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.REFRESH_TOKEN_REUSED,
        'This session was revoked because an old refresh token was reused. Sign in again.',
      );
    }
    const user =
      result.status === 'ok' ? await this.users.findOneBy({ id: result.session.userId }) : null;
    if (result.status !== 'ok' || !user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_REFRESH_TOKEN,
        'The refresh token is invalid or expired. Sign in again.',
      );
    }
    return this.issue(user, result);
  }

  /** Revokes the session behind a refresh token or a (still valid) access token. Idempotent. */
  async logout({
    refreshToken,
    accessToken,
  }: {
    refreshToken?: string;
    accessToken?: string;
  }): Promise<void> {
    const sessionId =
      this.sessions.sessionIdOf(refreshToken) ??
      (await this.verifyAccessToken(accessToken).catch(() => null))?.sessionId;
    if (sessionId) await this.sessions.revoke(sessionId, 'logout');
  }

  /**
   * The user behind an access token whose session is still active.
   * 401 ACCESS_TOKEN_EXPIRED (refresh and retry) or UNAUTHORIZED (sign in again).
   */
  async authenticate(accessToken: string | undefined): Promise<AdminUser> {
    const claims = await this.verifyAccessToken(accessToken);
    const user =
      claims && (await this.sessions.isActive(claims.sessionId, claims.userId))
        ? await this.users.findOneBy({ id: claims.userId })
        : null;
    if (!user)
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, 'Unauthorized');
    return toAdminUser(user);
  }

  private async issue(
    user: AdminUserEntity,
    { session, refreshToken }: IssuedSession,
  ): Promise<AuthResult> {
    const accessToken = await this.signAccessToken(user.id, user.role, session.id);
    return {
      user: toAdminUser(user),
      tokens: {
        accessToken,
        accessTokenMaxAge: this.accessTtlSeconds,
        refreshToken,
        refreshTokenMaxAge: Math.max(
          0,
          Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
        ),
      },
    };
  }

  private signAccessToken(userId: string, role: Role, sessionId: string): Promise<string> {
    return new SignJWT({ role, sid: sessionId })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.key);
  }

  /** Claims of a valid access token; `null` when missing/invalid; throws ACCESS_TOKEN_EXPIRED. */
  private async verifyAccessToken(
    token: string | undefined,
  ): Promise<{ userId: string; sessionId: string } | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [ALGORITHM] });
      const { sub, sid } = payload;
      return typeof sub === 'string' && UUID.test(sub) && typeof sid === 'string' && UUID.test(sid)
        ? { userId: sub, sessionId: sid }
        : null;
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) {
        throw new AppException(
          HttpStatus.UNAUTHORIZED,
          ErrorCode.ACCESS_TOKEN_EXPIRED,
          'Access token expired. Refresh it and retry.',
        );
      }
      return null;
    }
  }
}

function toAdminUser({ id, email, name, role }: AdminUserEntity): AdminUser {
  return { id, email, name, role };
}
