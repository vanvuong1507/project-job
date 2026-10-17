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
import { setLocation, setTotalCount } from '../../common/http/response-headers.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodParam,
  ApiZodQuery,
  ApiZodResponse,
} from '../../common/swagger/zod-openapi.js';
import {
  type DateRangeQuery,
  dateRangeQuerySchema,
  uuidSchema,
} from '../../common/validation/schemas.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import {
  type EventImpactResponse,
  eventImpactSchema,
  type EventInput,
  eventInputSchema,
  toEventImpactResponse,
} from './dto/event.dto.js';
import { EventsService } from './events.service.js';

const idPipe = new ZodValidationPipe(uuidSchema, 'id');

/** `/api/admin/events` (spec §1.2): events shown as markers on the dashboard chart. */
@ApiTags('Admin · Events')
@Controller('admin/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @Auth('events:read')
  @ApiOperation({
    summary: 'List events',
    description: 'Sorted by date. Both bounds are optional.',
  })
  @ApiZodQuery(dateRangeQuerySchema)
  @ApiZodResponse(200, z.array(eventImpactSchema), 'Events in the range (count in `X-Total-Count`)')
  @ApiErrorResponses(400)
  async list(
    @Query(new ZodValidationPipe(dateRangeQuerySchema)) range: DateRangeQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventImpactResponse[]> {
    const items = await this.events.list(range);
    setTotalCount(response, items.length);
    return items.map(toEventImpactResponse);
  }

  @Post()
  @Auth('events:write')
  @ApiOperation({ summary: 'Create an event' })
  @ApiZodBody(eventInputSchema)
  @ApiZodResponse(201, eventImpactSchema, 'Created (`Location` points to it)')
  @ApiErrorResponses(400)
  async create(
    @Body(new ZodValidationPipe(eventInputSchema)) body: EventInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EventImpactResponse> {
    const created = await this.events.create(body);
    setLocation(response, 'admin/events', created.id);
    return toEventImpactResponse(created);
  }

  @Put(':id')
  @Auth('events:write')
  @ApiOperation({ summary: 'Update an event' })
  @ApiZodParam('id', uuidSchema)
  @ApiZodBody(eventInputSchema)
  @ApiZodResponse(200, eventImpactSchema, 'Updated')
  @ApiErrorResponses(400, 404)
  async update(
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(eventInputSchema)) body: EventInput,
  ): Promise<EventImpactResponse> {
    return toEventImpactResponse(await this.events.update(id, body));
  }

  @Delete(':id')
  @Auth('events:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiZodParam('id', uuidSchema)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrorResponses(400, 404)
  remove(@Param('id', idPipe) id: string): Promise<void> {
    return this.events.remove(id);
  }
}
