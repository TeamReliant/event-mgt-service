import { Module } from '@nestjs/common';
import { EmailEngineService } from '@libs/notifications/email/email-engine/email-engine.service';
import { TeamInvitationsEventListenerService } from '../team-invitations/team-invitations.listener';
import { TeamInvitationsEmailService } from '@libs/notifications/email/team-invitations/team-invitations-email.service';

@Module({
  providers: [
    EmailEngineService,
    TeamInvitationsEventListenerService,
    TeamInvitationsEmailService,
  ],
})
export class EventsListenerModule {}
