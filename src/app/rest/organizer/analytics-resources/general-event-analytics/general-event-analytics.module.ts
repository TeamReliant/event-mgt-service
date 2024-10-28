import { Module } from '@nestjs/common';
import { GeneralEventAnalyticsService } from './general-event-analytics.service';
import { GeneralEventAnalyticsController } from './general-event-analytics.controller';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [GeneralEventAnalyticsController],
  providers: [GeneralEventAnalyticsService],
})
export class GeneralEventAnalyticsModule {}
