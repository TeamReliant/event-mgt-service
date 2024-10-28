import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { UsersModule } from '@app/rest/users/users.module';
import { Event } from './entities/event.entity';
import { UsersService } from '@app/rest/users/users.service';
import { User } from '@app/rest/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Ticket, User]), UsersModule],
  controllers: [EventsController],
  providers: [EventsService, UsersService, AzureBlobFileSystemService],
  exports: [EventsService],
})
export class EventsModule {}
