import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';

export class TaskEvent {
  constructor(public readonly task: Task) {}
}
