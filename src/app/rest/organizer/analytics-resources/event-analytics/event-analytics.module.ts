import { Module } from '@nestjs/common';
import { EventAnalyticsService } from './event-analytics.service';
import { EventAnalyticsController } from './event-analytics.controller';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [EventAnalyticsController],
  providers: [EventAnalyticsService],
})
export class EventAnalyticsModule {}
