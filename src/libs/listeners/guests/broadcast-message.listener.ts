import { events } from '@config/app.config';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BroadcastMessageEvent } from '@app/rest/organizer/guest-resources/guests/events/BroadcastMessage.event';
import { BroadcastMessageEmailService } from '@libs/notifications/email/guests/broadcast-message-email.service';

@Injectable()
export class BroadcastMessageListener {
  constructor(
    private readonly _broadcastMessageEmailService: BroadcastMessageEmailService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(events.BROADCAST_MESSAGE)
  async dispatchBroadcastMessageNotification(payload: BroadcastMessageEvent) {
    const { bookings, title, message } = payload;

    await this._broadcastMessageEmailService.sendBroadcastMessage(
      bookings,
      title,
      message,
    );

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BROADCAST_MESSAGE,
      this.dispatchBroadcastMessageNotification,
    );
  }
}
