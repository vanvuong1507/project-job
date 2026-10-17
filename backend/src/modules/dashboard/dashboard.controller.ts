import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  ApiErrorResponses,
  ApiZodQuery,
  ApiZodResponse,
} from '../../common/swagger/zod-openapi.js';
import { DashboardService } from './dashboard.service.js';
import {
  type RevenueTrendResponse,
  revenueTrendQuerySchema,
  revenueTrendResponseSchema,
} from './dto/revenue-trend.dto.js';

/** Public, read-only dashboard data (spec §1.2). */
@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('revenue-trend')
  @ApiOperation({
    summary: 'Revenue trend of a week',
    description:
      'The week (Mon–Sun), the previous 7 days for comparison, event markers and KPI summary. Public.',
  })
  @ApiZodQuery(revenueTrendQuerySchema)
  @ApiZodResponse(200, revenueTrendResponseSchema, 'Week data')
  @ApiErrorResponses(400)
  revenueTrend(
    @Query(new ZodValidationPipe(revenueTrendQuerySchema)) query: { weekStart?: string },
  ): Promise<RevenueTrendResponse> {
    return this.dashboard.getRevenueTrend(query.weekStart);
  }
}
