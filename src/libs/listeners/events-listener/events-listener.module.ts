import { Module } from '@nestjs/common';
import { EmailEngineService } from '@libs/notifications/email/email-engine/email-engine.service';
import { TeamInvitationsListener } from '../team-invitations/team-invitations.listener';
import { TeamInvitationsEmailService } from '@libs/notifications/email/team-invitations/team-invitations-email.service';
import { TasksEmailService } from '@libs/notifications/email/tasks/tasks-email.service';
import { TasksListener } from '@libs/listeners/tasks/tasks.listener';
import { PaymentsEmailService } from '@libs/notifications/email/payments/payments-email.service';
import { PaymentListener } from '../payments/payments-listener.module';

@Module({
  providers: [
    EmailEngineService,
    TeamInvitationsListener,
    TeamInvitationsEmailService,
    TasksListener,
    TasksEmailService,
    PaymentsEmailService,
    PaymentListener 
  ],
})
export class EventsListenerModule {}
