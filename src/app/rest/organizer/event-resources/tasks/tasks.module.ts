import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@app/rest/users/users.module';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';
import { PermissionsModule } from '@app/rest/organizer/team-resources/permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    UsersModule,
    PaginationModule,
    PermissionsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
