import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { EventsService } from '@app/rest/organizer/event-resources/events/events.service';
import { UsersService } from '@app/rest/users/users.service';
import { TJwtPayload } from '@libs/types';
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

  private async getCurrentlyLoggedInUser(user: TJwtPayload) {
    const userData = await this.userService.findOneById(user.userId);
    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return userData;
  }

  async findEvents(req: Request) {
    const { eventTag, eventLocation, eventDate } = req.query;
    if (!eventTag && !eventLocation && !eventDate) {
      throw new BadRequestException(
        'Please provide at least one search parameter',
      );
    }

    const parsedEventDate = eventDate ? new Date(eventDate as string) : null;
    if (parsedEventDate && parsedEventDate < new Date()) {
      throw new BadRequestException('Event date must be in the future');
    }

    const events = this.eventService.findAll({
      tags: eventTag ? eventTag : undefined,
      locationName: eventLocation ? eventLocation : undefined,
      eventStartDateAndTime: eventDate ? eventDate : undefined,
    });
    if (!events) {
      throw new NotFoundException('No events found');
    }

    return events;
  }

  async getEventsNearMe(req: Request) {
    if (!req.ip) {
      throw new BadRequestException('User IP address not provided');
    }

    const userLocation = await this.userService.getUserLocation(req.ip);
    if (!userLocation) {
      throw new BadRequestException('Failed to get user location');
    }

    const radius = 0.01;

    const queryBuilder = this.entityManager
      .createQueryBuilder(Event, 'event')
      .where('event.eventStatus = :status', { status: 'published' })
      .andWhere('event.eventVisibility = :visibility', {
        visibility: 'public',
      });

    if (userLocation.lat && userLocation.lon) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('event.latitude BETWEEN :minLat AND :maxLat', {
            minLat: userLocation.lat - radius,
            maxLat: userLocation.lat + radius,
          }).andWhere('event.longitude BETWEEN :minLong AND :maxLong', {
            minLong: userLocation.lon - radius,
            maxLong: userLocation.lon + radius,
          });
        }),
      );
    }

    queryBuilder
      .andWhere('event.locationName ILIKE :locationName', {
        locationName: `%${userLocation.city ?? 'USA'}%`,
      })
      .orWhere('event.address ILIKE :address', {
        address: `%${userLocation.city ?? 'USA'}%`,
      })
      .andWhere('event.eventStartDateAndTime > :currentDate', {
        currentDate: new Date(),
      });

    return queryBuilder.getMany();
  }

  async getTopEventsInMyCountry() {}

  async getTopEventsInTheWorld() {}
}
