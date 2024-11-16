import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { ConfigService } from '@nestjs/config';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import puppeteer from 'puppeteer';
import * as pug from 'pug';
import * as qr from 'qrcode';
import * as path from 'path';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { EntityManager } from 'typeorm';

@Injectable()
export class BookingsEmailService {
  constructor(
    private readonly emailEngineService: EmailEngineService,
    private readonly configService: ConfigService,
    private readonly azureBlob: AzureBlobFileSystemService,
    private readonly entityManager: EntityManager,
  ) {}

  templatePath = () => {
    // Get the root directory of project (where NestJS application is located)
    const rootDir = process.cwd(); // This gets the current working directory

    // Construct the path to the 'dist' folder
    const distFolderPath = path.join(rootDir, 'dist');

    // Construct the path to the 'mail templates' folder
    return path.join(distFolderPath, 'resources', 'templates', 'mail');
  };

  async generateTicketBuffers(booking: Booking) {
    const qrCodeBase64 = await qr.toDataURL(
      `https://localhost/ticket/${booking.id}`,
    );

    // Render HTML from Pug
    const html = pug.renderFile(`${this.templatePath()}/bookings/ticket.pug`, {
      ...booking,
      qrCodeBase64: qrCodeBase64.replace('data:image/png;base64,', ''),
    });

    // Generate PDF and JPEG using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.screenshot({ path: 'ticket-debug.png' });

    // Generate PDF Buffer
    const pdfBuffer = await page.pdf({ format: 'A4' });

    // Generate JPEG Buffer
    const jpegBuffer = await page.screenshot({ type: 'jpeg' });

    await browser.close();

    return { pdfBuffer, jpegBuffer };
  }

  async sendBookingCompletedMessage(bookings: Booking[]) {
    const booking = bookings.find((booking) => booking);
    const { appName, appEmail, companyName } = appInfo;
    const attachments: any[] = [];

    for (const slot of bookings) {
      const { pdfBuffer, jpegBuffer } = await this.generateTicketBuffers(slot);

      attachments.push({
        filename: `${slot.event.name}_${slot.ticket.name}_ticket.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
      attachments.push({
        filename: `${slot.event.name}_${slot.ticket.name}_ticket.jpeg`,
        content: jpegBuffer,
        contentType: 'image/jpeg',
      });
    }

    const payload = {
      customer: {
        email: booking.email,
        firstName: booking.firstName,
        lastName: booking.lastName,
      },
      booking,
      appName,
      appEmail,
      companyName,
    };

    const subject: string = `BOOKING COMPLETED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [booking.email],
      subject,
      `bookings/bookings-completed`,
      payload,
      attachments,
    );
  }

  async sendBookingTransferredMessage(bookings: Booking[]) {
    const { email } = bookings.find((booking) => booking.email);
    const { appName } = appInfo;

    const payload = {
      bookings,
      appName,
    };

    const subject: string = `BOOKING COMPLETED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `teams/invitation`,
      payload,
    );
  }

  async sendBookingReceivedMessage(bookings: Booking[]) {
    const booking = bookings.find((booking) => booking);
    const { appName, appEmail, companyName } = appInfo;
    const attachments: any[] = [];

    for (const slot of bookings) {
      const { pdfBuffer, jpegBuffer } = await this.generateTicketBuffers(slot);

      attachments.push({
        filename: `${slot.event.name}_${slot.ticket.name}_ticket.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
      attachments.push({
        filename: `${slot.event.name}_${slot.ticket.name}_ticket.jpeg`,
        content: jpegBuffer,
        contentType: 'image/jpeg',
      });
    }

    const payload = {
      customer: {
        email: booking.email,
        firstName: booking.firstName,
        lastName: booking.lastName,
      },
      booking,
      appName,
      appEmail,
      companyName,
    };

    const subject: string = `TICKET RECEIVED - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [booking.email],
      subject,
      `bookings/bookings-received`,
      payload,
      attachments,
    );
  }
}
