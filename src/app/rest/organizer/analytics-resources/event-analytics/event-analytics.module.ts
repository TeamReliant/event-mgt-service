import { Module } from '@nestjs/common';
import { EventAnalyticsService } from './event-analytics.service';
import { EventAnalyticsController } from './event-analytics.controller';
import { UsersModule } from '@app/rest/users/users.module';
import { PermissionsModule } from '@app/rest/organizer/team-resources/permissions/permissions.module';

@Module({
  imports: [UsersModule, PermissionsModule],
  controllers: [EventAnalyticsController],
  providers: [EventAnalyticsService],
})
export class EventAnalyticsModule {}
