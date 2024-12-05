import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as pug from 'pug';
import { ConfigService } from '@nestjs/config';
import { appInfo } from '@config/app.config';

@Injectable()
export class EmailEngineService {
  private transporter: nodemailer.Transporter;
  private from_email: string = appInfo.fromEmail;
  private readonly appInfo: any;

  constructor(private configService: ConfigService) {
    const { appEmail, appName, companyName, companyPhone } = appInfo;
    this.appInfo = {
      name: appName,
      email: appEmail,
      companyName: companyName,
      phone: companyPhone,
    };

    this.transporter = nodemailer.createTransport(this.emailTransportConfig());
  }

  templatePath = () => {
    // Get the root directory of project (where NestJS application is located)
    const rootDir = process.cwd(); // This gets the current working directory

    // Construct the path to the 'dist' folder
    const distFolderPath = path.join(rootDir, 'dist');

    // Construct the path to the 'mail templates' folder
    return path.join(distFolderPath, 'resources', 'templates', 'mail');
  };

  emailTransportConfig = () => {
    return process.env.NODE_ENV == 'development'
      ? this.devEmailTransportConfig()
      : this.liveEmailTransportConfig();
  };

  devEmailTransportConfig = () => {
    return {
      host: this.configService.get<string>('DEV_EMAIL_HOST'),
      auth: {
        user: this.configService.get<string>('DEV_EMAIL_USER'),
        pass: this.configService.get<string>('DEV_EMAIL_PASS'),
      },
      port: this.configService.get<number>('DEV_EMAIL_PORT'),
      secure: false, // true for 465, false for other ports
    };
  };

  liveEmailTransportConfig = () => {
    return {
      host: this.configService.get<string>('LIVE_EMAIL_HOST'),
      auth: {
        user: this.configService.get<string>('LIVE_EMAIL_USER'),
        pass: this.configService.get<string>('LIVE_EMAIL_PASS'),
      },
      port: this.configService.get<number>('LIVE_EMAIL_PORT'),
    };
  };

  async sendHtmlEmail(
    to: string[],
    subject: string,
    template: string,
    payload: any,
    attachments: any[] = [],
  ) {
    const pugTemplatePath = `${this.templatePath()}/${template}.pug`;
    const newPayload = {
      payload: payload,
    };

    newPayload.payload.appInfo = this.appInfo;
    const html = pug.renderFile(pugTemplatePath, newPayload);

    const mailOptions = {
      from: `"${this.appInfo.name}" <${this.from_email}>`,
      to,
      subject,
      html,
      attachments,
    };

    this.transporter
      .sendMail(mailOptions)
      .then((res) => {
        // Do something in the future
      })
      .catch((err) => {
        // Log the error
        console.log(err);
      });

    return true;
  }
}
