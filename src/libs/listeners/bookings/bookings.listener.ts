import { events } from '@config/app.config';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BookingsEvent } from '@app/rest/attendee/bookings/events/bookings.event';
import { BookingsEmailService } from '@libs/notifications/email/bookings/bookings-email.service';
import { BookingEvent } from '@app/rest/attendee/bookings/events/booking.event';

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

  @OnEvent(events.BOOKING_RESENT)
  async dispatchBookingResentNotification(payload: BookingEvent) {
    const { booking } = payload;

    await this._bookingsEmailService.resendBookingMessage(booking);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_RESENT,
      this.dispatchBookingResentNotification,
    );
  }

  @OnEvent(events.BOOKING_REFUNDED)
  async dispatchBookingRefundedNotification(payload: BookingEvent) {
    const { booking } = payload;

    await this._bookingsEmailService.sendBookingRefundedMessage(booking);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_REFUNDED,
      this.dispatchBookingRefundedNotification,
    );
  }

  @OnEvent(events.BOOKING_REACTION_UPDATED)
  async dispatchBookingReactionUpdatedNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingReactionUpdatedMessage(
      bookings,
    );

    // Remove the event from the queue when done
    this._eventEmitter.removeListener(
      events.BOOKING_REACTION_UPDATED,
      this.dispatchBookingReactionUpdatedNotification,
    );
  }

  // @OnEvent(events.BOOKING_TRANSFERRED)
  // async dispatchBookingTransferredNotification(payload: BookingsEvent) {
  //   const { bookings } = payload;
  //
  //   await this._bookingsEmailService.sendBookingTransferredMessage(bookings);
  //
  //   // Remove the event from the queue  when done
  //   this._eventEmitter.removeListener(
  //     events.BOOKING_TRANSFERRED,
  //     this.dispatchBookingTransferredNotification,
  //   );
  // }

  @OnEvent(events.COMPLIMENTARY_BOOKING_SENT)
  async dispatchComplimentaryBookingSentNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingCompletedMessage(
      bookings,
      true,
    );

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.COMPLIMENTARY_BOOKING_SENT,
      this.dispatchComplimentaryBookingSentNotification,
    );
  }

  @OnEvent(events.BOOKING_RECEIVED)
  async dispatchBookingReceivedNotification(payload: BookingsEvent) {
    const { bookings } = payload;

    await this._bookingsEmailService.sendBookingReceivedMessage(bookings);

    // Remove the event from the queue  when done
    this._eventEmitter.removeListener(
      events.BOOKING_RECEIVED,
      this.dispatchBookingReceivedNotification,
    );
  }
}
