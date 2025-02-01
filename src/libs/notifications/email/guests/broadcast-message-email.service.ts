import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

@Injectable()
export class BroadcastMessageEmailService {
  constructor(private readonly emailEngineService: EmailEngineService) {}

  async sendBroadcastMessage(
    bookings: Booking[],
    title: string,
    message: string,
  ) {
    const { appName, appEmail, companyName } = appInfo;
    // spread the bookings emails into an array without repeats
    const emails: string[] = [];
    // TODO: Refactor and remove the loop later, bad implementation, did this because firstname is required
    for (const booking of bookings) {
      if (emails.includes(booking.email)) continue;

      const payload = {
        appName,
        appEmail,
        companyName,
        title,
        message,
        event: booking.event,
        firstname: booking.firstName,
      };

      const subject: string = `MESSAGE RECEIVED - ${appName}`;
      await this.emailEngineService.sendHtmlEmail(
        [booking.email],
        subject,
        `guests/broadcast-message`,
        payload,
      );

      emails.push(booking.email);
    }
  }
}
