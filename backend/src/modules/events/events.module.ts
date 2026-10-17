import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { EventImpactEntity } from './entities/event-impact.entity.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([EventImpactEntity]), AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
