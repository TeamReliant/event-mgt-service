import { EmailEngineService } from '../email-engine/email-engine.service';
import { Injectable } from '@nestjs/common';
import { appInfo } from '@config/app.config';
import { ExportData } from '@app/rest/admin/admin-management/entities/export-data.entity';
import { Parser } from 'json2csv';

@Injectable()
export class AdminEmailService {
  constructor(private readonly emailEngineService: EmailEngineService) {}
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
}
