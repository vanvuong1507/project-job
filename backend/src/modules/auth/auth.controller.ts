import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ApiErrorResponses, ApiZodBody, ApiZodResponse } from '../../common/swagger/zod-openapi.js';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH, SESSION_COOKIE } from './auth.constants.js';
import { type AuthResult, AuthService } from './auth.service.js';
import { Auth } from './decorators/auth.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import {
  type AdminUser,
  type LoginInput,
  loginSchema,
  type RefreshInput,
  refreshSchema,
  userResponseSchema,
} from './dto/auth.dto.js';
import { sessionTokenOf } from './guards/session.guard.js';
import type { ClientInfo } from './services/sessions.service.js';

/**
 * `/api/auth/*` (spec §1.2): sessions for the admin app.
 * Sign-in sets two httpOnly cookies: `admin_session` (short-lived access token, every path) and
 * `admin_refresh` (refresh token, only sent to /api/auth). Server-side clients read both from
 * `Set-Cookie`, send the access token as `Authorization: Bearer` and the refresh token in the body.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cookieBase: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    // Host-only cookies: shared by every port on localhost, so the admin app's proxy sees them too.
    this.cookieBase = { httpOnly: true, sameSite: 'lax', secure: config.auth.cookieSecure };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ refresh: true })
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Starts a session: sets `admin_session` (access token, JWT with `sub`, `role`, `sid`; 15 min by default) and `admin_refresh` (refresh token, path `/api/auth`; 7 days sliding, 30 days max). After 5 failed attempts for one email + IP the pair is locked for 15 minutes.',
  })
  @ApiZodBody(loginSchema)
  @ApiZodResponse(
    200,
    userResponseSchema,
    'Signed in; `Set-Cookie: admin_session=…; admin_refresh=…`',
  )
  @ApiErrorResponses(400, 401, 429)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AdminUser }> {
    return this.startSession(response, await this.auth.login(body, clientOf(request)));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ login: true })
  @ApiOperation({
    summary: 'Refresh the session',
    description:
      'Exchanges the refresh token (`admin_refresh` cookie, or `refreshToken` in the body) for a new access token AND a new refresh token (rotation): the old refresh token stops working. Replaying an old one revokes the whole session (`REFRESH_TOKEN_REUSED`). On failure both cookies are cleared.',
  })
  @ApiZodBody(refreshSchema)
  @ApiZodResponse(
    200,
    userResponseSchema,
    'Refreshed; new `admin_session` and `admin_refresh` cookies',
  )
  @ApiErrorResponses(400, 401, 429)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AdminUser }> {
    try {
      const result = await this.auth.refresh(refreshTokenOf(request, body), clientOf(request));
      return this.startSession(response, result);
    } catch (error) {
      this.clearSession(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sign out',
    description:
      'Revokes the session (refresh token from the cookie or body, else the access token) and clears both cookies. Its access tokens stop working immediately. Always 204.',
  })
  @ApiZodBody(refreshSchema)
  @ApiNoContentResponse({ description: 'Session revoked, cookies cleared' })
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout({
      refreshToken: refreshTokenOf(request, body),
      accessToken: sessionTokenOf(request),
    });
    this.clearSession(response);
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Current user' })
  @ApiZodResponse(200, userResponseSchema, 'The signed-in user')
  me(@CurrentUser() user: AdminUser): { user: AdminUser } {
    return { user };
  }

  private startSession(response: Response, { user, tokens }: AuthResult): { user: AdminUser } {
    response.cookie(SESSION_COOKIE, tokens.accessToken, {
      ...this.cookieBase,
      path: '/',
      maxAge: tokens.accessTokenMaxAge * 1000,
    });
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookieBase,
      path: REFRESH_COOKIE_PATH,
      maxAge: tokens.refreshTokenMaxAge * 1000,
    });
    return { user };
  }

  private clearSession(response: Response): void {
    response.clearCookie(SESSION_COOKIE, { ...this.cookieBase, path: '/' });
    response.clearCookie(REFRESH_COOKIE, { ...this.cookieBase, path: REFRESH_COOKIE_PATH });
  }
}

function refreshTokenOf(request: Request, body: RefreshInput): string | undefined {
  return (
    body.refreshToken ??
    (request.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE] ??
    undefined
  );
}

function clientOf(request: Request): ClientInfo {
  return { ip: request.ip, userAgent: request.header('user-agent') };
}
