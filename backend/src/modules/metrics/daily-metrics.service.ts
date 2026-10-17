import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type FindOptionsWhere, Not, type Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { dateWhere } from '../../database/utils/date-where.js';
import { weekDays } from '../../common/utils/dates.js';
import type { DateRangeQuery } from '../../common/validation/schemas.js';
import { DailyMetricEntity } from './entities/daily-metric.entity.js';
import type { DailyMetricInput, DayMetricsInput } from './dto/metrics.dto.js';

@Injectable()
export class DailyMetricsService {
  constructor(
    @InjectRepository(DailyMetricEntity) private readonly metrics: Repository<DailyMetricEntity>,
  ) {}

  list(range: DateRangeQuery = {}): Promise<DailyMetricEntity[]> {
    return this.metrics.find({ where: dateWhere(range), order: { date: 'ASC' } });
  }

  /** Rows between two dates (inclusive), for the dashboard. */
  between(from: string, to: string): Promise<DailyMetricEntity[]> {
    return this.list({ from, to });
  }

  /** Most recent date that has metrics, or `null` when the table is empty. */
  async latestDate(): Promise<string | null> {
    const row = await this.metrics.findOne({
      where: {},
      order: { date: 'DESC' },
      select: { date: true },
    });
    return row?.date ?? null;
  }

  async create(input: DailyMetricInput): Promise<DailyMetricEntity> {
    await this.assertDateFree(input.date);
    return this.metrics.save(this.metrics.create(input));
  }

  async update(id: string, input: DailyMetricInput): Promise<DailyMetricEntity> {
    const record = await this.metrics.findOneBy({ id });
    if (!record) throw notFound();
    await this.assertDateFree(input.date, id);
    return this.metrics.save(this.metrics.merge(record, input));
  }

  async remove(id: string): Promise<void> {
    const { affected } = await this.metrics.delete({ id });
    if (!affected) throw notFound();
  }

  /** Creates or updates Mon–Sun of the week starting at `weekStart` in one transaction. */
  async upsertWeek(
    weekStart: string,
    days: readonly DayMetricsInput[],
  ): Promise<DailyMetricEntity[]> {
    const dates = weekDays(weekStart);
    const rows = dates.map((date, i) => ({ date, ...days[i]! }));
    return this.metrics.manager.transaction(async (manager) => {
      const repository = manager.getRepository(DailyMetricEntity);
      await repository.upsert(rows, { conflictPaths: ['date'] });
      return repository.find({
        where: { date: Between(dates[0]!, dates.at(-1)!) },
        order: { date: 'ASC' },
      });
    });
  }

  private async assertDateFree(date: string, exceptId?: string): Promise<void> {
    const where: FindOptionsWhere<DailyMetricEntity> = exceptId
      ? { date, id: Not(exceptId) }
      : { date };
    if (await this.metrics.existsBy(where)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.DAILY_METRIC_DATE_TAKEN,
        `Metrics for ${date} already exist`,
      );
    }
  }
}

const notFound = () =>
  new AppException(
    HttpStatus.NOT_FOUND,
    ErrorCode.DAILY_METRIC_NOT_FOUND,
    'Daily metric not found',
  );
