import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { AdminUserEntity } from './entities/admin-user.entity.js';
import { AuthSessionEntity } from './entities/auth-session.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptsService } from './services/login-attempts.service.js';
import { SessionsService } from './services/sessions.service.js';
import { SessionGuard } from './guards/session.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity, AuthSessionEntity]),
    // Per-IP caps on POST /api/auth/login and /refresh (the only routes using ThrottlerGuard; each
    // skips the other's throttler). LoginAttemptsService adds the per-email login lockout.
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          { name: 'login', ttl: 60_000, limit: config.auth.loginRateLimit },
          { name: 'refresh', ttl: 60_000, limit: config.auth.refreshRateLimit },
        ],
        errorMessage: 'Too many requests to /api/auth. Please wait a minute and try again.',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginAttemptsService, SessionsService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
