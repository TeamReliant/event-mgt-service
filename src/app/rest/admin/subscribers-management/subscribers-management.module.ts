import { Module } from '@nestjs/common';
import { SubscribersManagementService } from './subscribers-management.service';
import { SubscribersManagementController } from './subscribers-management.controller';
import { UsersModule } from '@app/rest/users/users.module';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';

@Module({
  imports: [UsersModule, PaginationModule],
  controllers: [SubscribersManagementController],
  providers: [SubscribersManagementService],
})
export class SubscribersManagementModule {}
