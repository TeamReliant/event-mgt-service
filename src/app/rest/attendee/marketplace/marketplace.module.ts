import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { UsersService } from '@app/rest/users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from '@app/rest/organizer/event-resources/events/events.service';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { UsersModule } from '@app/rest/users/users.module';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { EventsModule } from '@app/rest/organizer/event-resources/events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, User]), UsersModule, EventsModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
