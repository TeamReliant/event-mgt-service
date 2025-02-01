import { Module } from '@nestjs/common';
import { EventManagementService } from './event-management.service';
import { EventManagementController } from './event-management.controller';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [EventManagementController],
  providers: [EventManagementService],
})
export class EventManagementModule {}
