import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventsService } from '@app/rest/organizer/event-resources/events/events.service';
import { UsersService } from '@app/rest/users/users.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Request } from 'express';
import { Brackets, EntityManager } from 'typeorm';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly userService: UsersService,
    private readonly eventService: EventsService,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async findEvents(req: Request) {
    const {
      whatEvent,
      eventLocation,
      eventStartDateAndTime,
      eventEndDateAndTime,
      lat,
      lon,
    } = req.query;

    const parsedStartDate = eventStartDateAndTime
      ? new Date(eventStartDateAndTime as string)
      : null;
    const parsedEndDate = eventEndDateAndTime
      ? new Date(eventEndDateAndTime as string)
      : null;

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate)
      throw new BadRequestException('Event end date must be after start date');
    if (parsedEndDate && parsedEndDate < new Date())
      throw new BadRequestException('Event end date must be in the future');

    const events = this.eventService.findAll({
      tags: whatEvent ? whatEvent : undefined,
      name: whatEvent ? whatEvent : undefined,
      locationName: eventLocation ? eventLocation : undefined,
      eventStartDateAndTime: eventStartDateAndTime
        ? eventStartDateAndTime
        : undefined,
      eventEndDateAndTime: eventEndDateAndTime
        ? eventEndDateAndTime
        : undefined,
      latitude: lat ? lat : null,
      longitude: lon ? lon : null,
    });
    if (!events) {
      throw new NotFoundException('No events found');
    }

    return events;
  }

  async findTopEvents(req: Request) {
    const { countryName } = req.query;
    const LIMIT = 10;

    try {
      const queryBuilder = this.entityManager
        .createQueryBuilder(Event, 'event')
        .leftJoinAndSelect('event.user', 'user')
        .leftJoinAndSelect('event.tickets', 'tickets')
        .where('event.deletedAt IS NULL')
        .andWhere(
          '(event.eventStatus = :status AND event.eventVisibility = :visibility)',
          {
            status: 'published',
            visibility: 'public',
          },
        )
        .andWhere('(event.eventEndDateAndTime >= :now)', { now: new Date() });

      if (typeof countryName === 'string' && countryName.trim()) {
        const countryVariants = {
          'united states': [
            'usa',
            'united states',
            'united states of america',
            'us',
            'u.s.',
            'u.s.a.',
          ],
          'united kingdom': [
            'uk',
            'great britain',
            'britain',
            'england',
            'united kingdom',
            'u.k.',
          ],
          'united arab emirates': ['uae', 'emirates', 'u.a.e.'],
          'south africa': ['sa', 'rsa', 'republic of south africa'],
          'saudi arabia': ['ksa', 'kingdom of saudi arabia'],
          'new zealand': ['nz', 'aotearoa'],
          'hong kong': ['hk', 'hong kong sar'],
          'south korea': ['korea', 'republic of korea', 'rok'],
          'north korea': ['dprk', "democratic people's republic of korea"],
          netherlands: ['holland', 'the netherlands'],
        };

        const variants = countryVariants[countryName.toLowerCase()] || [
          countryName,
        ];

        queryBuilder.andWhere(
          new Brackets((qb) => {
            variants.forEach((variant, index) => {
              const paramName = `countryName${index}`;
              if (index === 0) {
                qb.where(
                  '(LOWER(event.locationName) ILIKE :' +
                    paramName +
                    ' OR LOWER(event.address) ILIKE :' +
                    paramName +
                    ')',
                );
              } else {
                qb.orWhere(
                  '(LOWER(event.locationName) ILIKE :' +
                    paramName +
                    ' OR LOWER(event.address) ILIKE :' +
                    paramName +
                    ')',
                );
              }
            });
          }),
        );

        // Set parameters outside the Brackets
        variants.forEach((variant, index) => {
          const paramName = `countryName${index}`;
          queryBuilder.setParameter(paramName, `%${variant.toLowerCase()}%`);
        });
      }

      queryBuilder
        .addOrderBy('event.totalNumberOfTicketsSold', 'DESC')
        .addOrderBy('event.eventStartDateAndTime', 'ASC')
        .take(LIMIT);

      return await queryBuilder.getMany();
    } catch (error) {
      throw new Error(`Failed to fetch top events: ${error.message}`);
    }
  }

  async getTopEventsInTheWorld() {}
}
