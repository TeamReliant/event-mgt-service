import { Module } from '@nestjs/common';
import { AttendeeDashboardService } from './attendee-dashboard.service';
import { AttendeeDashboardController } from './attendee-dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventView]), UsersModule],
  controllers: [AttendeeDashboardController],
  providers: [AttendeeDashboardService],
})
export class AttendeeDashboardModule {}
