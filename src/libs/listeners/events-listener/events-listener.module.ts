import { Module } from '@nestjs/common';
import { EmailEngineService } from '@libs/notifications/email/email-engine/email-engine.service';
import { TeamInvitationsListener } from '../team-invitations/team-invitations.listener';
import { TeamInvitationsEmailService } from '@libs/notifications/email/team-invitations/team-invitations-email.service';
import { TasksEmailService } from '@libs/notifications/email/tasks/tasks-email.service';
import { TasksListener } from '@libs/listeners/tasks/tasks.listener';
import { PaymentsEmailService } from '@libs/notifications/email/payments/payments-email.service';
import { PaymentListener } from '../payments/payments-listener.module';
import { BookingsEmailService } from '@libs/notifications/email/bookings/bookings-email.service';
import { BookingsListener } from '@libs/listeners/bookings/bookings.listener';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';

@Module({
  providers: [
    EmailEngineService,
    TeamInvitationsListener,
    TeamInvitationsEmailService,
    BookingsEmailService,
    AzureBlobFileSystemService,
    TasksListener,
    TasksEmailService,
    PaymentsEmailService,
    PaymentListener,
    BookingsListener,
  ],
})
export class EventsListenerModule {}
