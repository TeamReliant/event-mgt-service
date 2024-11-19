import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';

export class BroadcastMessageEvent {
  constructor(
    public readonly bookings: Booking[],
    public readonly title: string,
    public readonly message: string,
  ) {}
}
