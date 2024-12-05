import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

export class BookingsEvent {
  constructor(public readonly bookings: Booking[]) {}
}
