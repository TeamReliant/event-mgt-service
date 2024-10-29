import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly _repo: Repository<Booking>,
    private readonly _entityManager: EntityManager,
  ) {}

  async create(
    body: CreateBookingDto,
    eventId: string,
    userId: string,
  ): Promise<Booking[]> {
    const { tickets, firstName, lastName, email } = body;

    // find the user with the userId
    const user = await this._entityManager.findOneBy(User, {
      id: userId,
    });
    // find the event with the eventId
    const event = await this._entityManager.findOneBy(Event, {
      id: eventId,
      eventStatus: EventStatus.PUBLISHED,
    });

    if (!event)
      throw new NotFoundException(`Event not found with the id: ${eventId}`);

    const bookingsToToBeSaved: Booking[] = [];
    const invalidTickets: string[] = [];

    // Loop through unit tickets
    for (const slot of tickets) {
      const { ticketId, quantity, category, reaction } = slot;
      const ticket = await this._entityManager
        .createQueryBuilder(Ticket, 'ticket')
        .leftJoinAndSelect('ticket.event', 'event')
        .where('ticket.id = :ticketId', { ticketId })
        .andWhere('event.id = :eventId', { eventId: event.id })
        .getOne();

      if (!ticket) {
        invalidTickets.push(ticketId);
        continue;
      }

      // check if the ticket fall in the category indicated
      if (category !== ticket.category)
        throw new NotAcceptableException(
          `Ticket ${ticketId} does not belong to the ${category} category`,
        );

      // check if the quantity is within the acceptable range
      if (quantity < ticket.minNumberOfTicketsOrderable)
        throw new NotFoundException(
          `Minimum number of tickets for ${ticketId} is ${ticket.minNumberOfTicketsOrderable}`,
        );

      if (quantity > ticket.maxNumberOfTicketsOrderable)
        throw new NotFoundException(
          `Maximum number of tickets for ${ticketId} is ${ticket.maxNumberOfTicketsOrderable}`,
        );

      if (quantity > ticket.availableTickets - ticket.numberOfTicketsSold)
        throw new NotFoundException(
          `Only ${ticket.availableTickets - ticket.numberOfTicketsSold} tickets are available for ${ticketId}`,
        );

      const booking = this._repo.create({
        quantity,
        category,
        reaction,
        email,
        firstName,
        lastName,
        user,
        event,
        ticket,
      });

      bookingsToToBeSaved.push(booking);
    }

    // check if there are any invalid tickets
    if (invalidTickets.length) {
      throw new NotFoundException(
        `The following tickets are invalid: ${invalidTickets.join(', ')}`,
      );
    }

    // save the created bookings
    const bookings = await this._repo.save(bookingsToToBeSaved);
    return bookings.map((booking) => {
      delete booking.ticket.event;
      delete booking.event;
      delete booking.user;
      return booking;
    });
  }

  findAll(userId: string) {
    return this._repo
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('bookings.userId = :userId', { userId });
  }

  async findOne(id: string, throwError: boolean = true): Promise<Booking> {
    const booking = await this._repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.ticket', 'ticket')
      .leftJoinAndSelect('booking.event', 'event')
      .where('booking.id = :id', { id })
      .getOne();

    if (!booking && throwError)
      throw new NotFoundException('Booking not found');
    return booking;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    // find the booking with the id and userId
    const booking = await this._repo
      .createQueryBuilder('booking')
      .where('booking.id = :id', { id })
      .andWhere('booking.userId = :userId', { userId })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.processed)
      throw new NotAcceptableException('Booking already processed');

    await this._repo.remove(booking);
    return true;
  }
}
