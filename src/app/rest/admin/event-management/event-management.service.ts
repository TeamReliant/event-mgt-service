import { Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { Request } from 'express';
import { EventStatus } from '@app/rest/organizer/event-resources/events/enums';

@Injectable()
export class EventManagementService {
  constructor(private readonly _entityManager: EntityManager) {}

  getAllEvents(req: Request): SelectQueryBuilder<Event> {
    const { query } = req;
    const {
      name,
      locationName,
      address,
      eventVisibility,
      eventStatus,
      eventStartDateAndTime,
      dateRangeStart,
      dateRangeEnd,
      search,
      pastPublishedEvents,
    } = query;

    const queryBuilder = this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.user', 'user')
      .where('1=1')
      .select([
        'event',
        'user.id',
        'user.email',
        'user.firstname',
        'user.lastname',
        'user.picture',
      ]);

    if (search)
      queryBuilder.andWhere('event.name ILIKE :search', {
        search: `%${search}%`,
      });

    if (name) queryBuilder.andWhere('event.name = :name', { name });

    if (locationName)
      queryBuilder.andWhere('event.locationName ILIKE :locationName', {
        locationName: `%${locationName}%`,
      });

    if (address)
      queryBuilder.andWhere('event.address ILIKE :address', {
        address: `%${address}%`,
      });

    if (eventVisibility)
      queryBuilder.andWhere('event.eventVisibility = :eventVisibility', {
        eventVisibility,
      });

    if (eventStatus)
      queryBuilder.andWhere('event.eventStatus = :eventStatus', {
        eventStatus,
      });

    if (eventStartDateAndTime)
      queryBuilder.andWhere(
        'event.eventStartDateAndTime >= :eventStartDateAndTime',
        {
          eventStartDateAndTime,
        },
      );

    if (dateRangeStart && dateRangeEnd)
      queryBuilder.andWhere(
        'event.createdAt BETWEEN :dateRangeStart AND :dateRangeEnd',
        { dateRangeStart, dateRangeEnd },
      );

    if (pastPublishedEvents) {
      const currentDate = new Date();
      queryBuilder.andWhere('event.eventEndDateAndTime < :currentDate', {
        currentDate,
      });

      queryBuilder.andWhere('event.eventStatus = :publishedStatus', {
        publishedStatus: EventStatus.PUBLISHED,
      });
    }

    queryBuilder.orderBy('event.createdAt', 'DESC');
    return queryBuilder;
  }
}
