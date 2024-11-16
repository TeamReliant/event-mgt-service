import { events } from '@config/app.config';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BookingsEvent } from '@app/rest/attendee/bookings/events/bookings.event';
import { BookingsEmailService } from '@libs/notifications/email/bookings/bookings-email.service';

@Injectable()
export class BookingsListener {
  constructor(
    private readonly _bookingsEmailService: BookingsEmailService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(events.BOOKING_COMPLETED)
  async dispatchBookingCompletedNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingCompletedMessage(bookings);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_COMPLETED,
      this.dispatchBookingCompletedNotification,
    );
  }

  @OnEvent(events.BOOKING_TRANSFERRED)
  async dispatchBookingTransferredNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingTransferredMessage(bookings);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_TRANSFERRED,
      this.dispatchBookingTransferredNotification,
    );
  }

  @OnEvent(events.BOOKING_RECEIVED)
  async dispatchBookingReceivedNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingReceivedMessage(bookings);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_RECEIVED,
      this.dispatchBookingTransferredNotification,
    );
  }
}
