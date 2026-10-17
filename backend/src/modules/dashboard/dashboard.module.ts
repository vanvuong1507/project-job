import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [MetricsModule, EventsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
