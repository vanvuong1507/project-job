import { Injectable } from '@nestjs/common';
import { addDays, DAYS_IN_WEEK, startOfWeek, todayIso } from '../../common/utils/dates.js';
import { EventsService } from '../events/events.service.js';
import { DailyMetricsService } from '../metrics/daily-metrics.service.js';
import { buildRevenueTrend } from './revenue-trend.builder.js';
import type { RevenueTrendResponse } from './dto/revenue-trend.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly metrics: DailyMetricsService,
    private readonly events: EventsService,
  ) {}

  /**
   * Revenue trend for the week starting at `weekStart` (a validated Monday). Without it: the latest
   * week that has data, or the current week when the database is empty.
   */
  async getRevenueTrend(weekStart?: string): Promise<RevenueTrendResponse> {
    const start = weekStart ?? startOfWeek((await this.metrics.latestDate()) ?? todayIso());
    const end = addDays(start, DAYS_IN_WEEK - 1);
    const [metrics, events] = await Promise.all([
      this.metrics.between(addDays(start, -DAYS_IN_WEEK), end),
      this.events.list({ from: start, to: end }),
    ]);
    return buildRevenueTrend({ weekStart: start, metrics, events });
  }
}
