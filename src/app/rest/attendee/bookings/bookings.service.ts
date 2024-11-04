import {
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';
import { ProcessBookingDto } from '@app/rest/attendee/bookings/dto/process-booking.dto';
import { PaymentService } from '@app/rest/organizer/payment-resources/payment/payment.service';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly _repo: Repository<Booking>,
    private readonly _entityManager: EntityManager,
    private readonly _paymentService: PaymentService,
    private readonly _configService: ConfigService,
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

      // find if the user has a booking
      const existingBooking = await this._repo.findOneBy({
        user: { id: userId },
        ticket: { id: ticketId },
      });

      if (existingBooking && !existingBooking.processed)
        await this._repo.remove(existingBooking);

      // Prevent user from going beyond allowed limit.
      if (
        existingBooking &&
        existingBooking.processed &&
        existingBooking.quantity + quantity > ticket.maxNumberOfTicketsOrderable
      )
        throw new NotFoundException(
          `Maximum number of tickets for ${ticketId} is ${ticket.maxNumberOfTicketsOrderable}, Please check previous processed bookings`,
        );

      if (quantity > ticket.availableTickets - ticket.numberOfTicketsSold)
        throw new NotFoundException(
          `Only ${ticket.availableTickets - ticket.numberOfTicketsSold} tickets are available for ${ticketId}`,
        );

      const booking = this._repo.create({
        quantity,
        category,
        reaction,
        unitAmount: ticket.price,
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

  async processBookings(body: ProcessBookingDto, userId: string) {
    // Check if percentage cut is configured properly
    const percentage = this._configService.get<number>('TICKET_PERCENTAGE_CUT');
    if (!percentage || percentage < 0 || percentage > 100)
      throw new InternalServerErrorException(
        'Ticket percentage cut not configured properly',
      );

    const { bookings } = body;
    const invalidBookings: string[] = [];
    const validBookings: Booking[] = [];

    for (const id of bookings) {
      const booking = await this._repo
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.ticket', 'ticket')
        .leftJoinAndSelect('booking.event', 'event')
        .where('booking.userId = :userId', { userId })
        .andWhere('booking.id = :id', { id })
        .getOne();

      if (!booking) {
        invalidBookings.push(id);
        continue;
      }

      if (booking.processed)
        throw new NotAcceptableException(
          `Booking with id ${id} has already been processed`,
        );

      const {
        ticket: { availableTickets, numberOfTicketsSold },
      } = booking;
      const unsoldTickets = availableTickets - numberOfTicketsSold;
      if (booking?.quantity > unsoldTickets)
        throw new NotFoundException(
          `Only ${booking?.ticket.availableTickets - booking?.ticket.numberOfTicketsSold} tickets are available for ${id}`,
        );

      // push to valid bookings
      validBookings.push(booking);
    }

    if (invalidBookings.length)
      throw new NotFoundException(
        `The following bookings are invalid: ${invalidBookings.join(', ')}`,
      );

    if (!validBookings.length)
      throw new NotAcceptableException(
        `Please supply at least one valid booking`,
      );

    return await this._entityManager.transaction(async (manager) => {
      // find the user with the userId
      const user = await manager.findOneBy(User, {
        id: userId,
      });

      // process stripe auth url here
      const response = await this._paymentService.createCheckoutSession(
        validBookings,
        user,
      );

      // Check if the checkout session creation failed
      if (!response?.url) throw new NotAcceptableException(response?.message);

      // Save the transaction details
      const transaction = manager.create(BookingsTransaction, {
        stripeCheckoutId: response?.id,
        stripeCheckoutUrl: response?.url,
        totalAmount: response?.amount_total / 100,
        currency: response?.currency,
        user,
        bookings: validBookings,
      });

      await manager.save(BookingsTransaction, transaction);
      // Return the checkout URL for payment.
      if (response?.url) return { checkoutUrl: response };
    });
  }
}
