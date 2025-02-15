import { Expose } from 'class-transformer';

export class EventExportDto {
  @Expose({ name: 'Event Name' })
  eventName: string;

  @Expose({ name: 'Organizer' })
  organizer: string;

  @Expose({ name: 'Location' })
  location: string;

  @Expose({ name: 'Created On' })
  createdOn: Date;

  @Expose({ name: 'Event Date' })
  eventDate: string;

  @Expose({ name: 'Status' })
  status: string;

  @Expose({ name: 'RSVP Tickets' })
  rsvpTickets: number;

  @Expose({ name: 'Paid Tickets' })
  paidTickets: number;
}
