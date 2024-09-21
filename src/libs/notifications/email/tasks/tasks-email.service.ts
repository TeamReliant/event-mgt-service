import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { Task } from '@app/rest/event-resources/tasks/entities/task.entity';

@Injectable()
export class TasksEmailService {
  constructor(private readonly emailEngineService: EmailEngineService) {}

  async sendTaskAssignmentMessage(task: Task) {
    const { email } = task.assignee.user;
    const { appName } = appInfo;

    const payload = {
      task: task,
      assignee: task.assignee.user,
      appName: appName,
    };

    const subject: string = `TASK ASSIGNED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `tasks/task-assignment`,
      payload,
    );
  }
}
