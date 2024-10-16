import { TeamInvitationsEvent } from '@app/rest/team-resources/team-invitations/events/team-invitations.event';
import { events } from '@config/app.config';
import { TeamInvitationsEmailService } from '@libs/notifications/email/team-invitations/team-invitations-email.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TeamInvitationsListener {
  constructor(
    private readonly _teamInvitationsEmailService: TeamInvitationsEmailService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(events.TEAM_MEMBER_INVITED)
  async dispatchInvitationNotification(payload: TeamInvitationsEvent) {
    const { invitation } = payload;
    console.log(payload);

    await this._teamInvitationsEmailService.sendInvitationMessage(invitation);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.TEAM_MEMBER_INVITED,
      this.dispatchInvitationNotification,
    );
  }

  @OnEvent(events.TEAM_INVITATION_ACCEPTED)
  async dispatchInvitationAcceptedNotification(payload: TeamInvitationsEvent) {
    const { invitation } = payload;
    await this._teamInvitationsEmailService.sendInvitationAcceptedMessage(
      invitation,
    );

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.TEAM_INVITATION_ACCEPTED,
      this.dispatchInvitationAcceptedNotification,
    );
  }
}
