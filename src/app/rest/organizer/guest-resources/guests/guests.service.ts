import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { SendBroadcastMessageDto } from '@app/rest/organizer/guest-resources/guests/dto/send-broadcast-message.dto';
import { events } from '@config/app.config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BroadcastMessageEvent } from '@app/rest/organizer/guest-resources/guests/events/BroadcastMessage.event';
import { CheckGuestDto } from '@app/rest/organizer/guest-resources/guests/dto/check-guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    private readonly _entityManager: EntityManager,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  findAllGuests(
    eventId: string,
    userId: string,
    { ...query },
  ): SelectQueryBuilder<Booking> {
    const {
      sort,
      sortDir,
      ticketNumber,
      search,
      status,
      category,
      dateRangeStart,
      dateRangeEnd,
    } = query;

    const queryBuilder = this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('bookings.eventId = :eventId', { eventId })
      .andWhere('event.userId = :userId', { userId })
      .andWhere('bookings.status != :status', {
        status: BookingStatus.PENDING,
      });

    // check if a search key is supplied
    if (search) {
      const searchTerms = search.trim().split(' ');

      if (searchTerms.length === 1) {
        // Single term search: match either firstname or lastname (case-insensitive)
        queryBuilder.andWhere(
          `(bookings.firstName ILIKE :search OR bookings.lastName ILIKE :search)`,
          { search: `%${search}%` },
        );
      }

      if (searchTerms.length === 2) {
        // Two terms: match both firstname and lastname in sequence (case-insensitive)
        const [firstName, lastName] = searchTerms;
        queryBuilder.andWhere(
          `((bookings.firstName ILIKE :firstName AND bookings.lastName ILIKE :lastName) 
          OR (bookings.firstName ILIKE :lastName AND bookings.lastName ILIKE :firstName))`,
          { firstName: `%${firstName}%`, lastName: `%${lastName}%` },
        );
      }
    }

    // check if ticket Number is supplied
    if (ticketNumber) {
      queryBuilder.andWhere('bookings.bookingId = :bookingId', {
        bookingId: `#${ticketNumber}`,
      });
    }

    // check if status is supplied
    if (status)
      queryBuilder.andWhere('bookings.status = :bookingStatus', {
        bookingStatus: status,
      });

    // check if category is supplied
    if (category)
      queryBuilder.andWhere('bookings.category = :category', { category });

    // check if sort is supplied
    if (sort) {
      const sortOrder =
        sortDir && sortDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`bookings.${sort}`, sortOrder);
    }

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

    return queryBuilder;
  }

  async sendBroadcastMessage(
    eventId: string,
    userId: string,
    body: SendBroadcastMessageDto,
  ) {
    const { bookingIds, title, message } = body;
    // fetch the bookings with the bookingIds
    const bookings = await this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .where('bookings.eventId = :eventId', { eventId })
      .andWhere('event.userId = :userId', { userId })
      .andWhere('bookings.id IN (:...bookingIds)', { bookingIds })
      .andWhere('bookings.status != :bookingStatus', {
        bookingStatus: BookingStatus.PENDING,
      })
      // .andWhere('bookings.transferStatus != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .getMany();

    console.log(bookings);

    // check if the bookings are found
    if (!bookings.length)
      throw new NotAcceptableException(
        'No bookings found for the given bookingIds',
      );

    // dispatch the broadcast message event
    this._eventEmitter.emit(
      events.BROADCAST_MESSAGE,
      new BroadcastMessageEvent(bookings, title, message),
    );

    // return from the method
    return;
  }

  async showGuest(eventId: string, userId: string, bookingId: string) {
    const booking = await this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('bookings.eventId = :eventId', { eventId })
      .andWhere('event.userId = :userId', { userId })
      .andWhere('bookings.id = :bookingId', { bookingId })
      .andWhere('bookings.status != :status', {
        status: BookingStatus.PENDING,
      })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }

  async check(eventId: string, userId: string, body: CheckGuestDto) {
    const { bookingId, check } = body;

    // find the booking
    const booking = await this.showGuest(eventId, userId, bookingId);

    // check if the booking has been transferred
    if (booking.transferStatus === TicketTransferStatus.TRANSFERRED)
      throw new NotAcceptableException('Ticket has been transferred');

    // check if the booking has already been used
    if (check === 'in' && booking.status === BookingStatus.USED)
      throw new NotAcceptableException('Ticket has already been used');

    // check if the booking has not been used
    if (check === 'out' && booking.status !== BookingStatus.USED)
      throw new NotAcceptableException('Ticket has not been used');

    // update the ticket accordinly
    booking.status = check === 'in' ? BookingStatus.USED : BookingStatus.VALID;
    return this._entityManager.getRepository(Booking).save(booking);
  }
}
