import { Module } from '@nestjs/common';
import { EmailEngineService } from '@libs/notifications/email/email-engine/email-engine.service';

@Module({
  providers: [
    EmailEngineService,
  ],
})
export class EventsListenerModule {}
