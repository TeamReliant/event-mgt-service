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
    bookings.filter((booking) => {
      if (!emails.includes(booking.email)) emails.push(booking.email);
      return true;
    });

    const payload = {
      appName,
      appEmail,
      companyName,
      title,
      message,
      event: bookings[0].event,
    };

    const subject: string = `MESSAGE RECEIVED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      emails,
      subject,
      `guests/broadcast-message`,
      payload,
    );
  }
}
