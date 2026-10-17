import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import type { DateRangeQuery } from '../../common/validation/schemas.js';
import { dateWhere } from '../../database/utils/date-where.js';
import { EventImpactEntity } from './entities/event-impact.entity.js';
import type { EventInput } from './dto/event.dto.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventImpactEntity) private readonly events: Repository<EventImpactEntity>,
  ) {}

  list(range: DateRangeQuery = {}): Promise<EventImpactEntity[]> {
    return this.events.find({ where: dateWhere(range), order: { date: 'ASC', createdAt: 'ASC' } });
  }

  create(input: EventInput): Promise<EventImpactEntity> {
    return this.events.save(this.events.create(input));
  }

  async update(id: string, input: EventInput): Promise<EventImpactEntity> {
    const record = await this.events.findOneBy({ id });
    if (!record) throw notFound();
    return this.events.save(this.events.merge(record, input));
  }

  async remove(id: string): Promise<void> {
    const { affected } = await this.events.delete({ id });
    if (!affected) throw notFound();
  }
}

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, ErrorCode.EVENT_NOT_FOUND, 'Event not found');
