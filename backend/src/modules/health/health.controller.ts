import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { z } from 'zod';
import { ApiZodResponse } from '../../common/swagger/zod-openapi.js';
import { errorResponseSchema } from '../../common/validation/schemas.js';

const liveSchema = z.object({ status: z.literal('ok') });
const readySchema = z.object({ status: z.literal('ok'), database: z.literal('up') });

/** Probes for load balancers / process managers / uptime checks. */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('live')
  @ApiOperation({
    summary: 'Liveness',
    description: 'The process is up (no dependencies checked).',
  })
  @ApiZodResponse(200, liveSchema, 'Alive')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get(['', 'ready'])
  @ApiOperation({
    summary: 'Readiness',
    description: 'The API can reach Postgres. Also served at /api/health.',
  })
  @ApiZodResponse(200, readySchema, 'Ready')
  @ApiZodResponse(503, errorResponseSchema, 'Database unavailable (`SERVICE_UNAVAILABLE`)')
  async ready(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ok', database: 'up' };
  }
}
