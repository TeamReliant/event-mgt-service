import { events } from '@config/app.config';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AdminEmailService } from '@libs/notifications/email/admin/admin.email.service';
import { AllUsersExportEvent } from '@app/rest/admin/admin-management/events/export-all-users.event';

@Injectable()
export class AdminEmailListener {
  constructor(
    private readonly adminEmailService: AdminEmailService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(events.EXPORT_ALL_USERS_CSV)
  async sendEmailWithExportedUsersCSV(payload: AllUsersExportEvent) {
    console.log('Sending exported data email...');

    await this.adminEmailService.exportUsersCSV(payload.exportData);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.EXPORT_ALL_USERS_CSV,
      this.sendEmailWithExportedUsersCSV,
    );
  }

  @OnEvent(events.EXPORT_ALL_SUBSCRIBERS_CSV)
  async sendEmailWithExportedSubscribersCSV(userId: string) {
    console.log('Sending exported subscribers data email...');

    await this.adminEmailService.exportSubscribersCSV(userId);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.EXPORT_ALL_SUBSCRIBERS_CSV,
      this.sendEmailWithExportedSubscribersCSV,
    );
  }
}
