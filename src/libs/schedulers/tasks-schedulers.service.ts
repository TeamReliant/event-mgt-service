import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TasksEmailService } from '@libs/notifications/email/tasks/tasks-email.service';
import { Cron } from '@nestjs/schedule';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';

@Injectable()
export class TasksSchedulersService {
  private readonly logger = new Logger(TasksSchedulersService.name);

  constructor(
    private readonly entityManager: EntityManager,
    private readonly tasksEmailService: TasksEmailService,
  ) {}

  // @Cron('0 0 * * *') // Runs daily at midnight
  // // @Cron('*/1 * * * *') // Runs every minute
  // async sendReminderEmails(): Promise<void> {
  //   this.logger.log('Running scheduled tasks reminder email job...');
  //
  //   // get the current date
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  //
  //   const threeDaysAgo = new Date();
  //   threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  //   threeDaysAgo.setHours(0, 0, 0, 0);
  //
  //   const tasks = await this.entityManager
  //     .createQueryBuilder(Task, 'tasks')
  //     .leftJoinAndSelect('tasks.assignee', 'assignee')
  //     .leftJoinAndSelect('assignee.user', 'user')
  //     .where('tasks.dueDate >= :threeDaysAgo', { threeDaysAgo })
  //     .andWhere('tasks.dueDate <= :today', { today })
  //     .getMany();
  //
  //   if (!tasks.length) {
  //     this.logger.log('No tasks found for reminders.');
  //     return;
  //   }
  //
  //   const batchSize = 20;
  //
  //   for (let i = 0; i < tasks.length; i += batchSize) {
  //     const batch = tasks.slice(i, i + batchSize);
  //     await Promise.all(
  //       batch.map((task) =>
  //         this.tasksEmailService.sendTaskReminderMessage(task),
  //       ),
  //     );
  //   }
  //
  //   this.logger.log(`Sent ${tasks.length} reminder emails.`);
  // }

  @Cron('0 0 * * *') // Runs daily at midnight
  async sendReminderEmails(): Promise<void> {
    this.logger.log('Running scheduled tasks reminder email job...');

    // Get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const batchSize = 100; // Adjust based on system capacity
    let page = 0;
    let tasks: Task[];

    do {
      tasks = await this.entityManager
        .createQueryBuilder(Task, 'tasks')
        .leftJoinAndSelect('tasks.assignee', 'assignee')
        .leftJoinAndSelect('assignee.user', 'user')
        .where('tasks.dueDate >= :threeDaysAgo', { threeDaysAgo })
        .andWhere('tasks.dueDate <= :today', { today })
        .take(batchSize)
        .skip(page * batchSize)
        .getMany();

      if (!tasks.length) {
        if (page === 0) this.logger.log('No tasks found for reminders.');
        break;
      }

      for (const task of tasks) {
        try {
          await this.tasksEmailService.sendTaskReminderMessage(task);
        } catch (error) {
          this.logger.error(
            `Failed to send email for task ${task.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Processed batch ${page + 1}, sent ${tasks.length} emails.`,
      );
      page++;
    } while (tasks.length === batchSize);

    this.logger.log('Finished sending reminder emails.');
  }
}
