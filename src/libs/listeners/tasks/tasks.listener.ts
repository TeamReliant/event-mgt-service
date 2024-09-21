import { events } from '@config/app.config';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TaskEvent } from '@app/rest/event-resources/tasks/events/task.event';
import { TasksEmailService } from '@libs/notifications/email/tasks/tasks-email.service';

@Injectable()
export class TasksListener {
  constructor(
    private readonly _tasksEmailService: TasksEmailService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(events.TASK_ASSIGNED)
  async dispatchTaskAssignmentNotification(payload: TaskEvent) {
    const { task } = payload;
    await this._tasksEmailService.sendTaskAssignmentMessage(task);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.TASK_ASSIGNED,
      this.dispatchTaskAssignmentNotification,
    );
  }
}
