import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@app/rest/users/users.module';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), UsersModule, PaginationModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
