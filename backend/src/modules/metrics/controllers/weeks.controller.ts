import { Body, Controller, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodParam,
  ApiZodResponse,
} from '../../../common/swagger/zod-openapi.js';
import { weekStartSchema } from '../../../common/validation/schemas.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { DailyMetricsService } from '../daily-metrics.service.js';
import {
  toDailyMetricResponse,
  type WeekUpsertInput,
  type WeekUpsertResponse,
  weekUpsertResponseSchema,
  weekUpsertSchema,
} from '../dto/metrics.dto.js';

/** `PUT /api/admin/weeks/:weekStart` (spec §1.2): upserts Mon–Sun in one transaction. */
@ApiTags('Admin · Daily metrics')
@Controller('admin/weeks')
export class WeeksController {
  constructor(private readonly metrics: DailyMetricsService) {}

  @Put(':weekStart')
  @Auth('metrics:write')
  @ApiOperation({
    summary: 'Save a whole week',
    description: 'Creates or updates the 7 days in one transaction.',
  })
  @ApiZodParam('weekStart', weekStartSchema, 'Monday of the week (YYYY-MM-DD)')
  @ApiZodBody(weekUpsertSchema)
  @ApiZodResponse(200, weekUpsertResponseSchema, 'The 7 stored days')
  @ApiErrorResponses(400)
  async upsert(
    @Param('weekStart', new ZodValidationPipe(weekStartSchema, 'weekStart')) weekStart: string,
    @Body(new ZodValidationPipe(weekUpsertSchema)) { days }: WeekUpsertInput,
  ): Promise<WeekUpsertResponse> {
    const saved = await this.metrics.upsertWeek(weekStart, days);
    return { weekStart, days: saved.map(toDailyMetricResponse) };
  }
}
