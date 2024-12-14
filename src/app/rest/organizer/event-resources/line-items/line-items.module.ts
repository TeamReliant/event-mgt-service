import { Module } from '@nestjs/common';
import { LineItemsService } from './line-items.service';
import { LineItemsController } from './line-items.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@app/rest/users/users.module';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';
import { LineItem } from '@app/rest/organizer/event-resources/line-items/entities/line-item.entity';
import { PermissionsModule } from '@app/rest/organizer/team-resources/permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LineItem]),
    UsersModule,
    PaginationModule,
    PermissionsModule,
  ],
  controllers: [LineItemsController],
  providers: [LineItemsService],
})
export class LineItemsModule {}
