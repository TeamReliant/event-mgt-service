import { Module } from '@nestjs/common';
import { OrganizerDashboardService } from './organizer-dashboard.service';
import { OrganizerDashboardController } from './organizer-dashboard.controller';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [OrganizerDashboardController],
  providers: [OrganizerDashboardService],
})
export class OrganizerDashboardModule {}
