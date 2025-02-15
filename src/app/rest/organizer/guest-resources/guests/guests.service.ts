import {
  BadRequestException,
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
import { SystemRegister } from '@app/rest/admin/system-register/entities/system-register.entity';
import { Event } from '../../event-resources/events/entities/event.entity';
import { User } from '@app/rest/users/entities/user.entity';

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
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('team.permissions', 'permissions')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('bookings.eventId = :eventId', { eventId })
      // .andWhere(
      //   '(bookings.status = :validStatus OR bookings.status = :usedStatus OR bookings.refunded = :refunded)',
      //   {
      //     validStatus: BookingStatus.VALID,
      //     usedStatus: BookingStatus.USED,
      //     refunded: true,
      //   },
      // )
      // .andWhere('bookings.transfer_status != :transferStatus', {
      //   transferStatus: TicketTransferStatus.TRANSFERRED,
      // })
      .select([
        'bookings',
        'event',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'team',
        'permissions',
        'ticket',
      ]);

    // check if status is supplied
    if (status) {
      queryBuilder.andWhere('bookings.status = :bookingStatus', {
        bookingStatus: status,
      });
    } else {
      queryBuilder.andWhere(
        '(bookings.status = :validStatus OR bookings.status = :usedStatus OR bookings.refunded = :refunded)',
        {
          validStatus: BookingStatus.VALID,
          usedStatus: BookingStatus.USED,
          refunded: true,
        },
      );
    }

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
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(dateRangeEnd);
      endOfDay.setHours(24, 59, 59, 999);

      queryBuilder.andWhere('bookings.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    if (!sort) {
      queryBuilder.orderBy('bookings.createdAt', 'DESC');
    }
    return queryBuilder;
  }

  private async validateBroadcastMessageSending(event: Event, userId: string) {
    // get user to get subscribedPlan
    const user = await this._entityManager
      .getRepository(User)
      .findOneBy({ id: userId });

    if (!user)
      throw new NotFoundException(
        `SendBroadcastMessage: User with Id: ${userId} not found`,
      );

    const planRestrictions = {
      free: 1,
      pro: 5,
      premium: 10,
    };

    const limit = planRestrictions[user.subscribedPlan];

    if (event.numberOfBroadcastMessageSent >= limit) {
      throw new NotAcceptableException(
        `Broadcast limit of (${limit}) reached for ${user.subscribedPlan} plan`,
      );
    }
  }
  async sendBroadcastMessage(
    eventId: string,
    userId: string,
    body: SendBroadcastMessageDto,
  ) {
    const { bookingIds, title, message, all } = body;
    let bookings: Booking[];

    let event = await this._entityManager
      .getRepository(Event)
      .findOneBy({ id: eventId });

    if (!event) {
      throw new NotFoundException(
        `SendBroadcastMessage: Event with Id - ${eventId} not found`,
      );
    }

    //Validate before sending
    await this.validateBroadcastMessageSending(event, userId);

    // check if all is true
    if (all && all === 'true') {
      // fetch the bookings with the bookingIds
      bookings = await this._entityManager
        .getRepository(Booking)
        .createQueryBuilder('bookings')
        .leftJoinAndSelect('bookings.event', 'event')
        .where('bookings.eventId = :eventId', { eventId })
        .andWhere('event.userId = :userId', { userId })
        .andWhere('bookings.status = :bookingStatus', {
          bookingStatus: BookingStatus.VALID,
        })
        // .andWhere('bookings.transferStatus != :transferStatus', {
        //   transferStatus: TicketTransferStatus.TRANSFERRED,
        // })
        .getMany();

      // check if the bookings are found
      if (!bookings.length)
        throw new NotAcceptableException(
          'No bookings found for the given bookingIds',
        );
    }

    if (!all || all === 'false') {
      // check if bookingIds is supplied
      if (!bookingIds || !bookingIds.length)
        throw new NotAcceptableException('No bookingIds supplied');

      // fetch the bookings with the bookingIds
      bookings = await this._entityManager
        .getRepository(Booking)
        .createQueryBuilder('bookings')
        .leftJoinAndSelect('bookings.event', 'event')
        .where('bookings.eventId = :eventId', { eventId })
        .andWhere('event.userId = :userId', { userId })
        .andWhere('bookings.id IN (:...bookingIds)', { bookingIds })
        .andWhere('bookings.status = :bookingStatus', {
          bookingStatus: BookingStatus.VALID,
        })
        // .andWhere('bookings.transferStatus != :transferStatus', {
        //   transferStatus: TicketTransferStatus.TRANSFERRED,
        // })
        .getMany();
    }

    // check if the bookings are found
    if (!bookings.length)
      throw new NotAcceptableException(
        'No bookings found for the given bookingIds',
      );

    //Update broadcast count
    await this._entityManager.getRepository(Event).update(
      { id: eventId },
      {
        numberOfBroadcastMessageSent: event.numberOfBroadcastMessageSent + 1,
      },
    );

    // dispatch the broadcast message event
    this._eventEmitter.emit(
      events.BROADCAST_MESSAGE,
      new BroadcastMessageEvent(bookings, title, message),
    );

    // return from the method
    return;
  }

  async showGuest(bookingId: string) {
    const booking = await this._entityManager
      .getRepository(Booking)
      .createQueryBuilder('bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('team.members', 'teamMembers')
      .leftJoinAndSelect('teamMembers.user', 'teamMemberUser')
      .leftJoinAndSelect('teamMembers.permissions', 'teamMemberPermissions')
      .leftJoinAndSelect('team.permissions', 'permissions')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('bookings.id = :bookingId', { bookingId })
      .andWhere('bookings.status != :status', {
        status: BookingStatus.PENDING,
      })
      .andWhere('booking.refunded != :refunded', { refunded: true })
      .select([
        'bookings',
        'event',
        'team',
        'teamMembers',
        'teamMemberUser.id',
        'teamMemberUser.firstname',
        'teamMemberUser.lastname',
        'teamMemberUser.email',
        'teamMemberPermissions',
        'permissions',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'ticket',
      ])
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');

    return booking;
  }

  async check(eventId: string, userId: string, body: CheckGuestDto) {
    const { bookingId, check } = body;

    // find the booking
    const booking = await this.showGuest(bookingId);

    if (booking.refunded)
      throw new NotAcceptableException('Ticket has been refunded');

    // check if the booking has been transferred
    if (booking.transferStatus === TicketTransferStatus.TRANSFERRED)
      throw new NotAcceptableException('Ticket has been transferred');

    // check if the booking has already been used
    if (check === 'in' && booking.status === BookingStatus.USED)
      throw new NotAcceptableException('Ticket has already been used');

    // check if the booking has not been used
    if (check === 'out' && booking.status !== BookingStatus.USED)
      throw new NotAcceptableException('Ticket has not been used');

    return await this._entityManager.transaction(async (manager) => {
      // update the ticket accordinly
      booking.status =
        check === 'in' ? BookingStatus.USED : BookingStatus.VALID;

      // fetch the system register
      const systemRegister = await manager
        .createQueryBuilder(SystemRegister, 'system')
        .getOne();

      // update the register
      systemRegister.scannedTickets += 1;
      await manager.save<SystemRegister>(systemRegister);

      return manager.getRepository(Booking).save(booking);
    });
  }
}
