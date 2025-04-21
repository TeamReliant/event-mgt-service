import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { UsersModule } from '@app/rest/users/users.module';
import { ActiveUsersModule } from '@app/rest/active-users/active-users.module';

@Module({
  imports: [UsersModule, ActiveUsersModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
