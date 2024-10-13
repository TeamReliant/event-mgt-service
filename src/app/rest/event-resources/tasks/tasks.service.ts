import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Task } from '@app/rest/event-resources/tasks/entities/task.entity';
import { UsersService } from '@app/rest/users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';
import { events } from '@config/app.config';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { generateRandomString } from '@libs/helpers/char-generator';
import { TaskEvent } from '@app/rest/event-resources/tasks/events/task.event';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly _repo: Repository<Task>,
    private readonly _eventEmitter: EventEmitter2,
    private readonly _entityManager: EntityManager,
  ) {}

  async assign(body: AssignTaskDto, eventId: string, userId: string) {
    // destructuring the body
    const { title, description, dueDate, priority, assigneeId } = body;

    // find the event, team and its members with the provided
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'assignedUser')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the event exists
    if (!event)
      throw new NotFoundException(`Event with id ${eventId} not found`);

    // check if the current user is the owner of the event
    if (event.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // check if the team exists
    if (!event.team) throw new NotFoundException('Event has no team');

    let assignee: TeamMember;
    if (assigneeId) {
      // find the assignee from the team members
      assignee = event.team.members.find((member) => member.id === assigneeId);
      // check if the assignee exists/ is a team member
      if (!assignee)
        throw new NotFoundException(
          `Team member with id ${assigneeId} not found`,
        );
    }

    // generate a task id
    const taskId = await this.generateTaskId();
    // create the task
    const task = this._repo.create({
      taskId,
      title,
      description,
      dueDate,
      priority,
      assignee,
      event,
    });
    // save the task
    const savedTask = await this._repo.save(task);

    // emit an event for the task assignment
    this._eventEmitter.emit(events.TASK_ASSIGNED, new TaskEvent(savedTask));

    // return the saved task
    return savedTask;
  }

  findAll(eventId: string, { ...query }) {
    // find the tasks with the provided event id
    const queryBuilder = this._repo
      .createQueryBuilder('tasks')
      .leftJoinAndSelect('tasks.assignee', 'assignee')
      .leftJoinAndSelect('assignee.user', 'user')
      .where('tasks.eventId = :eventId', { eventId })
      .select([
        'tasks',
        'assignee',
        'user.id',
        'user.lastname',
        'user.firstname',
        'user.email',
      ]);

    if (query.search) {
      const search = query.search as string;
      queryBuilder.andWhere(
        `tasks.title LIKE :search OR tasks.description LIKE :search OR user.lastname LIKE :search OR user.firstname LIKE :search`,
        { search: `%${search}%` },
      );
    }

    queryBuilder.select(['tasks', 'assignee']);

    // return the query builder
    return queryBuilder;
  }

  async findOne(eventId: string, id: string, throwException: boolean = true) {
    const task = await this._repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('assignee.user', 'user')
      .where('task.eventId = :eventId', { eventId })
      .andWhere('task.id = :id', { id })
      .select(['task', 'assignee'])
      .getOne();

    // check if a task was found
    if (!task && throwException)
      throw new NotFoundException(`Task with id ${id} not found`);

    return task;
  }

  async findByTaskId(taskId: string, throwException: boolean = true) {
    const task = await this._repo
      .createQueryBuilder('task')
      .where('task.taskId = :taskId', { taskId })
      .getOne();

    // check if a task was found
    if (!task && throwException)
      throw new NotFoundException(`Task with taskId ${taskId} not found`);

    return task;
  }

  async update(
    id: string,
    eventId: string,
    userId: string,
    body: UpdateTaskDto,
  ) {
    // destructuring the body
    const { title, description, dueDate, priority, assigneeId } = body;

    // // find the event, team and its members with the provided
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('team.members', 'members')
      .where('event.id = :eventId', { eventId })
      .getOne();

    // check if the event exists
    if (!event)
      throw new NotFoundException(`Event with id ${eventId} not found`);

    // find the task, event and the assignee
    const task = await this._repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.event', 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'host')
      .leftJoinAndSelect('assignee.user', 'user')
      .where('task.id = :id', { id })
      .andWhere('task.eventId = :eventId', { eventId })
      .getOne();

    if (!task) throw new NotFoundException(`Task with the id ${id} not found`);

    // check if the current user is the owner of the event
    if (task.event?.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // check if the team exists
    if (!task.event?.team) throw new NotFoundException('Event has no team');

    await this._entityManager.transaction(async (manager) => {
      if (assigneeId === 'unassigned') {
        // unassign the task
        task.assignee = null;

        Object.assign(task, { title, description, dueDate, priority });
        await manager.save(task);
        return;
      }

      let assignee: TeamMember;
      if (assigneeId && assigneeId !== task.assignee?.id) {
        if (!this.isUUID(assigneeId))
          throw new NotAcceptableException(
            'assigneeId should either be a UUID or unassigned',
          );

        // find the assignee from the team members
        assignee = event.team.members.find(
          (member) => member.id === assigneeId,
        );
        // check if the assignee exists/ is a team member
        if (!assignee)
          throw new NotFoundException(
            `Team member with id ${assigneeId} not found`,
          );

        task.assignee = assignee;
        // emit an event for the task assignment
        this._eventEmitter.emit(events.TASK_ASSIGNED, new TaskEvent(task));
      }

      Object.assign(task, { title, description, dueDate, priority });
      await manager.save(task);
    });

    // find the updated data and return it
    return this.findOne(eventId, id);
  }

  async remove(id: string, eventId: string, userId: string) {
    // find the task, event and the assignee
    const task = await this._repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.event', 'event')
      .leftJoinAndSelect('event.user', 'host')
      .where('task.id = :id', { id })
      .andWhere('task.eventId = :eventId', { eventId })
      .getOne();

    if (!task) throw new NotFoundException(`Task with the id ${id} not found`);

    // check if the current user is the owner of the event
    if (task.event?.user?.id !== userId)
      throw new NotFoundException(
        'Authenticated user is not the owner of the event',
      );

    // delete the task
    await this._repo.remove(task);
    return true;
  }

  async generateTaskId(): Promise<string> {
    const taskId = `PT-${generateRandomString(6)}`;
    // check if there's already a user with the token
    if (await this.findByTaskId(taskId, false)) {
      return this.generateTaskId();
    }

    return taskId;
  }

  isUUID(str: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
