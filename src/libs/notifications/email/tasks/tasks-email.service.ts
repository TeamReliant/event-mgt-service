import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasksEmailService {
  constructor(private readonly emailEngineService: EmailEngineService,
    private readonly configService: ConfigService,
  ) {}

  async sendTaskAssignmentMessage(task: Task) {
    const { email } = task.assignee.user;
    const { appName } = appInfo;

    const payload = {
      task: task,
      assignee: task.assignee.user,
      appName: appInfo.appName,
      appEmail: appInfo.appEmail,
      dashBoardLink: this.configService.get<string>('FRONTEND_URL'),
    };

    const subject: string = `TASK ASSIGNED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `tasks/task-assignment`,
      payload,
    );
  }

  async sendTaskReminderMessage(task: Task) {
    const { email } = task.assignee.user;
    const { appName } = appInfo;

    const payload = {
      task: task,
      assignee: task.assignee.user,
      appName: appInfo.appName,
      appEmail: appInfo.appEmail,
      dashBoardLink: this.configService.get<string>('FRONTEND_URL'),
    };

    const subject: string = `TASK REMINDER - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `tasks/task-reminder`,
      payload,
    );
  }
}
