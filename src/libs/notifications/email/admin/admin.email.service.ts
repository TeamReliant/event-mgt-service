import { EmailEngineService } from '../email-engine/email-engine.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { appInfo } from '@config/app.config';
import { ExportData } from '@app/rest/admin/admin-management/entities/export-data.entity';
import { Parser } from 'json2csv';
import { EntityManager } from 'typeorm';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { SubscriberExportDto } from '@app/rest/admin/subscribers-management/dto/subscriber-export.dto';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventExportDto } from '@app/rest/admin/event-management/dto/event-export.dto';

@Injectable()
export class AdminEmailService {
  constructor(
    private readonly emailEngineService: EmailEngineService,
    private readonly entityManager: EntityManager,
  ) {}
  async exportUsersCSV(data: ExportData) {
    const { userEmail, recordsToExport } = data;
    const timestamp = Date.now();
    const fields = [
      { label: 'Name', value: 'fullName' },
      { label: 'Email Address', value: 'email' },
      { label: 'Date Added', value: 'createdAt' },
      { label: 'User Type', value: 'userType' },
      { label: 'Last Active', value: 'lastLoggedIn' },
      { label: 'Status', value: 'status' },
      { label: 'Company Name', value: 'companyName' },
      { label: 'Plan', value: 'subscribedPlan' },
      { label: 'Phone Number', value: 'phoneNumber' },
      { label: 'Country', value: 'country' },
      { label: 'City', value: 'city' },
      { label: 'State', value: 'state' },
      { label: 'Address', value: 'address' },
      { label: 'Zip', value: 'zip' },
      { label: 'Website Url', value: 'website' },
    ];

    const parser = new Parser({
      fields,
      header: true,
      defaultValue: 'N/A',
    });
    const csv = parser.parse(recordsToExport);

    const subject = `Exported Users Data - ${appInfo.appName}`;
    const attachments = [
      {
        filename: `All-Users-Export.csv`,
        content: Buffer.from(csv),
        contentType: 'text/csv',
      },
    ];

    const { appName, appEmail, companyName } = appInfo;
    await this.emailEngineService.sendHtmlEmail(
      [userEmail],
      subject,
      'admin/export-users-csv',
      { userEmail, appName, appEmail, companyName },
      attachments,
    );
  }

  async exportSubscribersCSV(userId: string) {
    const subscribers = await this.entityManager
      .createQueryBuilder(Subscriber, 'subscriber')
      .where('subscriber.subscribed = :subscribed', { subscribed: true })
      .getMany();
    // const {userId} =  request.user as unknown as any;
    const loggedInUser = await this.entityManager.findOneBy(User, {
      id: userId,
    });
    if (!loggedInUser) throw new BadRequestException('User does not exist');

    const mappedData = subscribers.map((subscriber) => {
      return {
        email: subscriber.email,
        createdAt: subscriber.createdAt,
      };
    });

    // Transform with options
    const records = plainToInstance(SubscriberExportDto, mappedData, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    const fields = [
      { label: 'EMAIL ADDRESS', value: 'email' },
      { label: 'DATE JOINED', value: 'createdAt' },
    ];

    const parser = new Parser({
      fields,
      header: true,
      defaultValue: 'N/A',
    });
    const csv = parser.parse(records);

    const subject = `Exported Subscribers Data - ${appInfo.appName}`;
    const attachments = [
      {
        filename: `All-Subscribers-Export.csv`,
        content: Buffer.from(csv),
        contentType: 'text/csv',
      },
    ];

    const { appName, appEmail, companyName } = appInfo;
    await this.emailEngineService.sendHtmlEmail(
      [loggedInUser.email],
      subject,
      'admin/export-subscribers-csv',
      { email: loggedInUser.email, appName, appEmail, companyName },
      attachments,
    );
  }

  async exportEventsCSV(userId: string) {
    const events = await this.entityManager
      .createQueryBuilder(Event, 'events')
      .leftJoinAndSelect('events.user', 'user')
      .getMany();

    const loggedInUser = await this.entityManager.findOneBy(User, {
      id: userId,
    });
    if (!loggedInUser) throw new BadRequestException('User does not exist');

    const mappedData = events.map((event) => {
      const formattedDate = event.eventStartDateAndTime.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      );

      const formattedTime = event.eventStartDateAndTime.toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        },
      );

      return {
        eventName: event.name,
        organizer: event.user.firstname + ' ' + event.user.lastname,
        location: event.locationName,
        createdOn: event.createdAt,
        eventDate: `${formattedDate} at ${formattedTime}`,
        status: event.eventStatus,
        rsvpTickets: event.totalNumberOfTicketsRsvp,
        paidTickets: event.totalNumberOfTicketsSold,
      };
    });

    // Transform with options
    const records = plainToInstance(EventExportDto, mappedData, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    const fields = [
      { label: 'EVENT NAME', value: 'eventName' },
      { label: 'ORGANIZER', value: 'organizer' },
      { label: 'LOCATION', value: 'location' },
      { label: 'CREATED ON', value: 'createdOn' },
      { label: 'EVENT DATE', value: 'eventDate' },
      { label: 'STATUS', value: 'status' },
      { label: 'RSVP TICKETS', value: 'rsvpTickets' },
      { label: 'PAID TICKETS', value: 'paidTickets' },
    ];

    const parser = new Parser({
      fields,
      header: true,
      defaultValue: 'N/A',
    });
    const csv = parser.parse(records);

    const subject = `Exported Events Data - ${appInfo.appName}`;
    const attachments = [
      {
        filename: `All-Events-Export.csv`,
        content: Buffer.from(csv),
        contentType: 'text/csv',
      },
    ];

    const { appName, appEmail, companyName } = appInfo;
    await this.emailEngineService.sendHtmlEmail(
      [loggedInUser.email],
      subject,
      'admin/export-events-csv',
      { email: loggedInUser.email, appName, appEmail, companyName },
      attachments,
    );
  }
}
