import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { setLocation, setTotalCount } from '../../../common/http/response-headers.js';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodParam,
  ApiZodQuery,
  ApiZodResponse,
} from '../../../common/swagger/zod-openapi.js';
import {
  type DateRangeQuery,
  dateRangeQuerySchema,
  uuidSchema,
} from '../../../common/validation/schemas.js';
import { Auth } from '../../auth/decorators/auth.decorator.js';
import { DailyMetricsService } from '../daily-metrics.service.js';
import {
  type DailyMetricInput,
  dailyMetricInputSchema,
  type DailyMetricResponse,
  dailyMetricSchema,
  toDailyMetricResponse,
} from '../dto/metrics.dto.js';

const idPipe = new ZodValidationPipe(uuidSchema, 'id');

/** `/api/admin/daily-metrics` (spec §1.2). */
@ApiTags('Admin · Daily metrics')
@Controller('admin/daily-metrics')
export class DailyMetricsController {
  constructor(private readonly metrics: DailyMetricsService) {}

  @Get()
  @Auth('metrics:read')
  @ApiOperation({ summary: 'List days', description: 'Sorted by date. Both bounds are optional.' })
  @ApiZodQuery(dateRangeQuerySchema)
  @ApiZodResponse(200, z.array(dailyMetricSchema), 'Days in the range (count in `X-Total-Count`)')
  @ApiErrorResponses(400)
  async list(
    @Query(new ZodValidationPipe(dateRangeQuerySchema)) range: DateRangeQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<DailyMetricResponse[]> {
    const items = await this.metrics.list(range);
    setTotalCount(response, items.length);
    return items.map(toDailyMetricResponse);
  }

  @Post()
  @Auth('metrics:write')
  @ApiOperation({
    summary: 'Create a day',
    description: '`DAILY_METRIC_DATE_TAKEN` (409) if the date exists.',
  })
  @ApiZodBody(dailyMetricInputSchema)
  @ApiZodResponse(201, dailyMetricSchema, 'Created (`Location` points to it)')
  @ApiErrorResponses(400, 409)
  async create(
    @Body(new ZodValidationPipe(dailyMetricInputSchema)) body: DailyMetricInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<DailyMetricResponse> {
    const created = await this.metrics.create(body);
    setLocation(response, 'admin/daily-metrics', created.id);
    return toDailyMetricResponse(created);
  }

  @Put(':id')
  @Auth('metrics:write')
  @ApiOperation({ summary: 'Update a day' })
  @ApiZodParam('id', uuidSchema)
  @ApiZodBody(dailyMetricInputSchema)
  @ApiZodResponse(200, dailyMetricSchema, 'Updated')
  @ApiErrorResponses(400, 404, 409)
  async update(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(dailyMetricInputSchema)) body: DailyMetricInput,
  ): Promise<DailyMetricResponse> {
    return toDailyMetricResponse(await this.metrics.update(id, body));
  }

  @Delete(':id')
  @Auth('metrics:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a day' })
  @ApiZodParam('id', uuidSchema)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrorResponses(400, 404)
  remove(@Param('id', idPipe) id: string): Promise<void> {
    return this.metrics.remove(id);
  }
}
