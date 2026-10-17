import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import type { AppConfig } from './config/app-config.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';

/** Root module. The config is passed in, so tests can boot the app against another database. */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        DatabaseModule,
        HealthModule,
        AuthModule,
        MetricsModule,
        EventsModule,
        DashboardModule,
      ],
    };
  }
}
