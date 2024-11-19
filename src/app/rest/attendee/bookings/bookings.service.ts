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
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { TransferBookingDto } from '@app/rest/attendee/bookings/dto/transfer-booking.dto';
import { UserType } from '@app/rest/users/enums/user-type';
import { events } from '@config/app.config';
import { BookingsEvent } from '@app/rest/attendee/bookings/events/bookings.event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly _repo: Repository<Booking>,
    private readonly _entityManager: EntityManager,
    private readonly _paymentService: PaymentService,
    private readonly _configService: ConfigService,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  async create(
    body: CreateBookingDto,
    eventId: string,
    userId?: string,
  ): Promise<Booking[]> {
    const { tickets, firstName, lastName, email } = body;

    // find the user with the userId
    let user: User;
    if (userId)
      user = await this._entityManager.findOneBy(User, {
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
      if (
        ticket.minNumberOfTicketsOrderable &&
        quantity < ticket.minNumberOfTicketsOrderable
      )
        throw new NotAcceptableException(
          `Minimum number of tickets for ${ticketId} is ${ticket.minNumberOfTicketsOrderable}`,
        );

      if (
        ticket.maxNumberOfTicketsOrderable &&
        quantity > ticket.maxNumberOfTicketsOrderable
      )
        throw new NotAcceptableException(
          `Maximum number of tickets for ${ticketId} is ${ticket.maxNumberOfTicketsOrderable}`,
        );

      // find if the user has a pending booking of same ticket
      const existingBooking = await this._repo.findOneBy({
        status: BookingStatus.PENDING,
        processed: false,
        email,
        ticket: { id: ticketId },
      });

      if (existingBooking && !existingBooking.processed)
        await this._repo.remove(existingBooking);

      // Prevent user from going beyond allowed limit.
      if (
        quantity > ticket.maxNumberOfTicketsOrderable &&
        existingBooking &&
        existingBooking.processed &&
        existingBooking.quantity + quantity > ticket.maxNumberOfTicketsOrderable
      )
        throw new NotAcceptableException(
          `Maximum number of tickets for ${ticketId} is ${ticket.maxNumberOfTicketsOrderable}, Please check previous processed bookings`,
        );

      if (quantity > ticket.availableTickets - ticket.numberOfTicketsSold)
        throw new NotAcceptableException(
          `Only ${ticket.availableTickets - ticket.numberOfTicketsSold} tickets are available for ${ticketId}`,
        );

      const booking = this._repo.create({
        quantity,
        category,
        reaction,
        unitAmount: ticket.price,
        status: BookingStatus.PENDING,
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
      delete booking.user;
      return booking;
    });
  }

  findAll(userId: string, { ...query }) {
    const queryBuilder = this._repo
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('bookings.userId = :userId', { userId })
      .andWhere('bookings.status != :status', {
        status: BookingStatus.PENDING,
      });

    const { search, dateRangeStart, dateRangeEnd, status } = query;

    // check if a search key is supplied
    if (search)
      queryBuilder.andWhere(
        `ticket.name ILIKE :search OR event.name ILIKE :search`,
        {
          search: `%${search}%`,
        },
      );

    // Check if status is supplied
    if (status)
      queryBuilder.andWhere('bookings.status = :bookingStatus', {
        bookingStatus: status,
      });

    // check if date supplied
    // if (date) {
    //   queryBuilder.andWhere(`bookings.created_at LIKE :createdDate`, {
    //     createdDate: `${date}%`,
    //   });
    // }

    if (dateRangeStart && dateRangeEnd) {
      const startOfDay = new Date(dateRangeStart);
      startOfDay.setHours(1, 0, 0, 0);

      const endOfDay = new Date(dateRangeEnd);
      endOfDay.setHours(24, 59, 59, 999);

      queryBuilder.andWhere('bookings.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    queryBuilder.orderBy('bookings.createdAt', 'DESC');
    queryBuilder.select(['bookings', 'ticket', 'event']);
    return queryBuilder;
  }

  async findOne(id: string, throwError: boolean = true): Promise<Booking> {
    const booking = await this._repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.ticket', 'ticket')
      .leftJoinAndSelect('booking.event', 'event')
      .where('booking.id = :id', { id })
      .select([
        'booking.id',
        'booking.bookingId',
        'booking.status',
        'booking.firstName',
        'booking.lastName',
        'booking.processed',
        'booking.paid',
        'ticket.name',
        'event.name',
        'event.eventStartDateAndTime',
      ])
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

    const { bookings, cancelUrl } = body;
    const invalidBookings: string[] = [];
    const validBookings: Booking[] = [];

    let foundPaid: boolean = false;
    for (const id of bookings) {
      const booking = await this._repo
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.ticket', 'ticket')
        .leftJoinAndSelect('booking.event', 'event')
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

      if (booking.category === TicketCategory.PAID) foundPaid = true;
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

    // check if booking has no paid ticket
    if (!foundPaid) return this.processFreeBookings(validBookings);

    // if bookings contains paid
    return this.processMixedBookings(validBookings, userId, cancelUrl);
  }

  private async processMixedBookings(
    bookings: Booking[],
    userId: string = null,
    cancelUrl: string = null,
  ): Promise<any> {
    return await this._entityManager.transaction(async (manager) => {
      // find the user with the userId
      let user: User;
      if (userId)
        user = await manager.findOneBy(User, {
          id: userId,
        });

      // process stripe auth url here
      const response = await this._paymentService.createCheckoutSession(
        bookings,
        cancelUrl,
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
        bookings,
      });

      await manager.save(BookingsTransaction, transaction);
      // Return the checkout URL for payment.
      if (response?.url) return { checkoutUrl: response.url };
    });
  }

  private async processFreeBookings(bookings: Booking[]): Promise<any> {
    const newBookings: Booking[] = [];
    await this._entityManager.transaction(async (manager) => {
      for (const booking of bookings) {
        // spread the booking based on the quantity
        for (let i = 1; i <= booking.quantity; i++) {
          const newBooking = manager.create(Booking, {
            quantity: 1,
            category: booking.category,
            reaction: booking.reaction,
            unitAmount: booking.unitAmount,
            email: booking.email,
            firstName: booking.firstName,
            lastName: booking.lastName,
            user: booking.user,
            event: booking.event,
            ticket: booking.ticket,
            bookingId: await this.generateBookingId(),
            processed: true,
            status: BookingStatus.VALID,
          });

          if (
            booking.ticket.numberOfTicketsSold ===
            booking.ticket.availableTickets
          ) {
            booking.ticket.isAvailable = false;
          }

          // increase the number of tickets sold for the ticket
          booking.ticket.numberOfTicketsSold += 1;
          await manager.save(Ticket, booking.ticket);
          // push the new booking to the list to be saved
          newBookings.push(newBooking);
        }

        // remove the initial booking
        await manager.remove(Booking, booking);
      }
      // save the newly generated bookings
      await manager.save(Booking, newBookings);
    });

    this._eventEmitter.emit(
      events.BOOKING_COMPLETED,
      new BookingsEvent(newBookings),
    );
    return { checkoutUrl: null, bookings: newBookings };
  }

  async transferBooking(body: TransferBookingDto, userId: string) {
    const { bookingId, email, firstName, lastName } = body;
    const booking = await this._repo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.ticket', 'ticket')
      .leftJoinAndSelect('booking.event', 'event')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');

    if (!booking.processed)
      throw new NotAcceptableException(
        'Only processed bookings can be transferred',
      );

    if (booking.category === TicketCategory.PAID && !booking.paid)
      throw new NotAcceptableException(
        `Paid ticket's payment must be processed before transfer`,
      );

    // check if the booking has already been transferred
    if (booking.transferStatus)
      throw new NotAcceptableException(
        'You cannot transfer a transferred ticket',
      );

    // check if the ticket is already used
    if (booking.status === BookingStatus.USED)
      throw new NotAcceptableException('Used ticket cannot be transferred');

    // check if the destination user is a registered attendee
    const user = await this._entityManager.findOneBy(User, { email });

    // prevent a user from sending to himself
    if (user.id === userId)
      throw new NotAcceptableException(`Can't transfer to yourself`);

    const newBookings: Booking[] = [];
    // transfer the booking to the user
    await this._entityManager.transaction(async (manager) => {
      const bookingEntity = manager.create(Booking, {
        bookingId: booking.bookingId,
        quantity: 1,
        category: booking.category,
        reaction: booking.reaction,
        unitAmount: booking.unitAmount,
        processed: booking.processed,
        paid: booking.paid,
        status: BookingStatus.VALID,
        email: email,
        firstName: firstName,
        lastName: lastName,
        transferStatus: TicketTransferStatus.RECEIVED,
        transferredFrom: booking,
        user,
        event: booking.event,
        ticket: booking.ticket,
      });

      const savedBooking = await manager.save<Booking>(bookingEntity);
      newBookings.push(savedBooking);

      booking.status = BookingStatus.USED;
      booking.transferStatus = TicketTransferStatus.TRANSFERRED;
      booking.transferredTo = savedBooking;
      await manager.save(Booking, booking);
      return booking;
    });

    this._eventEmitter.emit(
      events.BOOKING_RECEIVED,
      new BookingsEvent(newBookings),
    );
  }

  /**
   * @param transactionId
   * @param userId
   * For cases where the service webhook wasn't reachable
   * for transaction verification from stripe.
   * This function verifies the transaction from the stripe checkout session id
   * manually and returns the transaction details
   */
  async verifyBooking(transactionId: string, userId: string) {
    const selectedFields = [
      'transaction.id',
      'transaction.stripeCheckoutId',
      'transaction.totalAmount',
      'transaction.currency',
      'transaction.processed',
      'bookings.id',
      'bookings.bookingId',
      'bookings.status',
      'bookings.processed',
      'event.id',
      'event.name',
      'ticket.id',
      'ticket.name',
    ];

    // find the session from the transaction
    const transaction = await this._entityManager
      .createQueryBuilder(BookingsTransaction, 'transaction')
      .leftJoinAndSelect('transaction.bookings', 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('transaction.id = :transactionId', {
        transactionId,
      })
      .andWhere('transaction.userId = :userId', { userId })
      .select(selectedFields)
      .getOne();

    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.processed) return transaction;

    // check and verify the checkout session
    const newTransaction =
      await this._paymentService.verifyBookingsCheckoutSession(
        transaction.stripeCheckoutId,
      );

    // return the transaction record if the verification succeeds
    if (newTransaction)
      return await this._entityManager
        .createQueryBuilder(BookingsTransaction, 'transaction')
        .leftJoinAndSelect('transaction.bookings', 'bookings')
        .leftJoinAndSelect('bookings.event', 'event')
        .leftJoinAndSelect('bookings.ticket', 'ticket')
        .where('transaction.id = :transactionId', {
          transactionId: newTransaction.id,
        })
        .andWhere('transaction.userId = :userId', { userId })
        .select(selectedFields)
        .getOne();

    // if the session is not verified, return error verifying transaction
    throw new InternalServerErrorException('Error verifying transaction');
  }

  async generateBookingId(): Promise<string> {
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const bookingId = `#${randNum}`;
    // check if the booking number already exists
    const booking = await this._repo.findOneBy({ bookingId });
    if (booking) return this.generateBookingId();

    return bookingId;
  }
}
