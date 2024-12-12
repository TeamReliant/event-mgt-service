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
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { AssignTaskParamsDto } from '@app/rest/organizer/event-resources/tasks/dto/assign-task-params.dto';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { FetchTasksParamsDto } from '@app/rest/organizer/event-resources/tasks/dto/fetch-tasks-params.dto';
import { FetchTasksQueriesDto } from '@app/rest/organizer/event-resources/tasks/dto/fetch-tasks-queries.dto';
import { ShowTaskParamsDto } from '@app/rest/organizer/event-resources/tasks/dto/show-task-params.dto';
import { UpdateTaskParamsDto } from '@app/rest/organizer/event-resources/tasks/dto/update-task-params.dto';
import { DeleteTaskParamsDto } from '@app/rest/organizer/event-resources/tasks/dto/delete-task-params.dto';
import { SubscriptionPlanGuard } from '@libs/Guards/subscription-plan/subscription-plan.guard';
import { RestrictedPlans } from '@libs/decorators/restrict-plans-decorators';
import { Request } from 'express';
import { TeamPermissions } from '@app/rest/organizer/team-resources/permissions/enums/team-permissions';
import { PermissionsService } from '@app/rest/organizer/team-resources/permissions/permissions.service';

@UseGuards(JwtAuthGuard, SubscriptionPlanGuard)
@RestrictedPlans(['free', 'pro'])
@Controller('events/:eventId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assign(
    @Body() body: AssignTaskDto,
    @Param() params: AssignTaskParamsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.TASK,
    );

    const data = await this.tasksService.assign(body, params.eventId, userId);
    delete data.event;
    return ResponseSerializer.data(data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Param() params: FetchTasksParamsDto,
    @Query() query: FetchTasksQueriesDto,
    @Req() req: Request,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    // check if the user is permitted
    this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.TASK,
    );

    const queryBuilder = this.tasksService.findAll(params.eventId, query);
    return ResponseSerializer.applyHTEAOS(req, queryBuilder);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param() params: ShowTaskParamsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.TASK,
    );

    const data = await this.tasksService.findOne(params.eventId, params.id);
    return ResponseSerializer.data(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.ACCEPTED)
  async update(
    @Param() params: UpdateTaskParamsDto,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetCurrentUserId() userId: string,
  ) {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.TASK,
    );

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
  async remove(
    @Param() params: DeleteTaskParamsDto,
    @GetCurrentUserId() userId: string,
  ) {
    // check if the user is permitted
    await this.permissionsService.isUserPermitted(
      userId,
      params.eventId,
      TeamPermissions.TASK,
    );

    await this.tasksService.remove(params.id, params.eventId, userId);
    return ResponseSerializer.message('Task deleted successfully');
  }
}
