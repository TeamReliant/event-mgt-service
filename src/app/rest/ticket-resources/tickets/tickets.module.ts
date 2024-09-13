import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';
import { Ticket } from './entities/ticket.entity';
import { UsersModule } from '@app/rest/users/users.module';
import { EventsModule } from '@app/rest/event-resources/events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Ticket]), UsersModule, EventsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
