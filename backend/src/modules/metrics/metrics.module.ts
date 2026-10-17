import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { DailyMetricsController } from './controllers/daily-metrics.controller.js';
import { WeeksController } from './controllers/weeks.controller.js';
import { DailyMetricsService } from './daily-metrics.service.js';
import { DailyMetricEntity } from './entities/daily-metric.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DailyMetricEntity]), AuthModule],
  controllers: [DailyMetricsController, WeeksController],
  providers: [DailyMetricsService],
  exports: [DailyMetricsService],
})
export class MetricsModule {}
