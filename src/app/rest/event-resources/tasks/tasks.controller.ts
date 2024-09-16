import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { AssignTaskParamsDto } from '@app/rest/event-resources/tasks/dto/assign-task-params.dto';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { FetchTasksParamsDto } from '@app/rest/event-resources/tasks/dto/fetch-tasks-params.dto';
import { FetchTasksQueriesDto } from '@app/rest/event-resources/tasks/dto/fetch-tasks-queries.dto';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';
import { Task } from '@app/rest/event-resources/tasks/entities/task.entity';
import { ShowTaskParamsDto } from '@app/rest/event-resources/tasks/dto/show-task-params.dto';
import { UpdateTaskParamsDto } from '@app/rest/event-resources/tasks/dto/update-task-params.dto';
import { DeleteTaskParamsDto } from '@app/rest/event-resources/tasks/dto/delete-task-params.dto';

@Controller('events/:eventId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly paginationProvider: PaginationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async assign(
    @Body() body: AssignTaskDto,
    @Param() params: AssignTaskParamsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    const data = await this.tasksService.assign(body, params.eventId, userId);
    delete data.event;
    return ResponseSerializer.data(data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  findAll(
    @Param() params: FetchTasksParamsDto,
    @Query() query: FetchTasksQueriesDto,
  ): Promise<IResponseWithData> {
    const queryBuilder = this.tasksService.findAll(params.eventId, query);
    return this.paginationProvider.applyHTEAOS<Task>(queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param() params: ShowTaskParamsDto,
  ): Promise<IResponseWithData> {
    const data = await this.tasksService.findOne(params.eventId, params.id);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param() params: UpdateTaskParamsDto,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.tasksService.update(
      params.id,
      params.eventId,
      userId,
      updateTaskDto,
    );
    return ResponseSerializer.data(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param() params: DeleteTaskParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    await this.tasksService.remove(params.id, params.eventId, userId);
    return ResponseSerializer.message('Task deleted successfully');
  }
}
