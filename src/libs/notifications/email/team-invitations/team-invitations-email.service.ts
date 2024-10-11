import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeamInvitationsEmailService {
  constructor(
    private readonly emailEngineService: EmailEngineService,
    private readonly configService: ConfigService,
  ) {}

  async sendInvitationMessage(invitation: TeamInvitation) {
    const { email } = invitation;
    const { appName } = appInfo;

    const payload = {
      invitation: invitation,
      appName: appName,
      reactionLink: `${this.configService.get<string>('FRONTEND_URL')}?token=${invitation.token}`,
    };

    const subject: string = `TEAM INVITATION ${appName}`;
    await this.emailEngineService.sendHtmlEmail(
      [email],
      subject,
      `teams/invitation`,
      payload,
    );
  }

  async sendInvitationAcceptedMessage(invitation: TeamInvitation) {
    const { email } = invitation;
    const { appName } = appInfo;

    const payload = {
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
