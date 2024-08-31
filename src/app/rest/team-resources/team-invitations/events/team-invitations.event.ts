import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';

export class TeamInvitationsEvent {
  constructor(public readonly invitation: TeamInvitation) {}
}
