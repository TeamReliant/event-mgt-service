import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

export class BookingEvent {
  constructor(public readonly booking: Booking) {}
}
