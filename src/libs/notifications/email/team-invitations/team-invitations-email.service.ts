import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { TeamInvitation } from '@app/rest/organizer/team-resources/team-invitations/entities/team-invitation.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeamInvitationsEmailService {
  b;
  constructor(
    private readonly emailEngineService: EmailEngineService,
    private readonly configService: ConfigService,
  ) {}

  async sendInvitationMessage(invitation: TeamInvitation) {
    const { email } = invitation;
    const { appName, appEmail, companyName } = appInfo;

    const payload = {
      invitation: invitation,
      appName: appName,
      appEmail: appEmail,
      companyName: companyName,
      appInfo,
      user: invitation.user,
      reactionLink: `${this.configService.get<string>('FRONTEND_URL')}/invitation?token=${invitation.token}`,
    };

    const subject: string = `TEAM INVITATION - ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `teams/invitation`,
      payload,
    );
  }

  async sendInvitationAcceptedMessage(invitation: TeamInvitation) {
    const { email } = invitation.team.admin;
    const { appName } = appInfo;


    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const dateTime = `${formattedDate} at ${formattedTime}`;

    const payload = {
      dateTime,
      invitation: invitation,
      appInfo,
    };

    const subject: string = `INVITATION ACCEPTED | ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `teams/invitation-accepted`,
      payload,
    );
  }
}
