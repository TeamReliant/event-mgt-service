import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import slugify from 'slugify';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { TJwtPayload } from '@libs/types';
import { User } from '@app/rest/users/entities/user.entity';
import { Request } from 'express';
import { AssignTeamDto } from '@app/rest/organizer/event-resources/events/dto/assign-team.dto';
import { Team } from '@app/rest/organizer/team-resources/teams/entities/team.entity';
import { UsersService } from '@app/rest/users/users.service';
import { EventView } from '@app/rest/attendee/dashboard/entities/event-view.entity';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    private readonly entityManager: EntityManager,
    private readonly userService: UsersService,
    private readonly azureBlobService: AzureBlobFileSystemService,
  ) {}

  private async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No file provided for upload');
    const url = await this.azureBlobService.uploadFileAsync(file);
    if (!url) throw new BadRequestException('Image upload failed');
    return url;
  }

  private async deleteImage(url: string): Promise<void> {
    if (url) {
      await this.azureBlobService.deleteFileAsync(url);
    }
  }

  private getCountOfPublishedEventCreatedThisMonth(user: User) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    if (!user.events) return 0;
    return user.events.filter((event) => {
      const eventDate = new Date(event.createdAt);
      return (
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear &&
        event.eventStatus === 'published'
      );
    }).length;
  }

  private validateEventCreation(
    user: User,
    eventVisibility: string,
    eventStatus: string,
  ) {
    if (!user.isOnboarded && eventStatus !== 'draft')
      throw new BadRequestException(
        'Please complete stripe payout account setup to publish event',
      );
    const { subscribedPlan, numOfPrivateEventsCreated } = user;

    const plan = subscribedPlan.toLowerCase();
    const visibility = eventVisibility.toLowerCase();

    const planRestrictions = {
      free: { maxPublishableEvents: 4, maxPrivateEvents: 0 },
      pro: { maxPublishableEvents: 8, maxPrivateEvents: 5 },
      premium: { maxPublishableEvents: Infinity, maxPrivateEvents: Infinity },
    };

    const { maxPublishableEvents, maxPrivateEvents } = planRestrictions[plan];
    const publishedEventsCreatedThisMonthCount =
      this.getCountOfPublishedEventCreatedThisMonth(user);

    if (plan === 'free' && visibility === 'private') {
      throw new BadRequestException(
        'Users on the free plan cannot create private events',
      );
    }

    if (
      visibility === 'private' &&
      numOfPrivateEventsCreated >= maxPrivateEvents
    ) {
      throw new BadRequestException(
        'Private event limit exceeded for this user',
      );
    }

    if (
      eventStatus === 'published' &&
      publishedEventsCreatedThisMonthCount >= maxPublishableEvents
    ) {
      throw new BadRequestException(
        'Monthly limit for creating publishable events exceeded for this user',
      );
    }
  }

  private updateUserEventCounts(user: User, eventVisibility: string) {
    const visibility = eventVisibility.toLowerCase();

    if (visibility === 'private') {
      user.numOfPrivateEventsCreated++;
    }

    user.numOfEventsCreated++;
  }

  async create(createEventDto: CreateEventDto, user: TJwtPayload) {
    let eventImageURL: string;
    const timestampInSeconds = `-${Math.floor(Date.now() / 1000)}`;

    // check if the event name already exists
    const slugExists = await this.eventRepo.findOneBy({
      slug: slugify(createEventDto.name, { lower: true }),
    });

    try {
      const {
        eventCoverImage,
        tickets,
        eventVisibility,
        eventStatus,
        ...rest
      } = createEventDto;

      if (createEventDto.locationName == null && createEventDto.address == null)
        throw new BadRequestException(
          'Please provide an address for your event',
        );

      if (eventCoverImage) {
        eventImageURL = await this.uploadImage(eventCoverImage);
      }

      //eventCreator: user creating the event
      const eventCreator = await this.entityManager.findOne(User, {
        where: { id: user.userId },
        relations: ['events'],
      });

      if (!eventCreator) {
        throw new NotFoundException('User not found');
      }

      this.validateEventCreation(eventCreator, eventVisibility, eventStatus);
      this.updateUserEventCounts(eventCreator, eventVisibility);

      const createdEvent = await this.entityManager.transaction(
        async (manager) => {
          const eventInstance = manager.create(Event, {
            ...rest,
            slug: `${slugify(rest.name, { lower: true })}${slugExists ? timestampInSeconds : ''}`,
            eventImageURL,
            eventVisibility,
            eventStatus,
            user: eventCreator,
          });
          if (tickets && tickets.length > 0) {
            eventInstance.tickets = tickets.map((ticket) =>
              manager.create(Ticket, ticket),
            );
          }

          await manager.save<User>(eventCreator);
          return await manager.save<Event>(eventInstance);
        },
      );
      return createdEvent;
    } catch (error) {
      //if saving of event fails, delete the uploaded image
      await this.deleteImage(eventImageURL);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        console.error(error.message);
        throw error;
      }
      console.error('Error creating event:', error);
      throw new BadRequestException('Error creating event: ', error.message);
    }
  }

  // //NEEDED BY ADMIN
  // findAll(req: Request) {
  //   const { query } = req;
  //   const {
  //     name,
  //     location,
  //     address,
  //     eventVisibility,
  //     eventStatus,
  //     eventStartDateAndTime,
  //   } = query;

  //   const queryBuilder = this.eventRepo.createQueryBuilder('event');
  //   if (name) {
  //     queryBuilder.andWhere('event.name LIKE :name', { name: `%${name}%` });
  //   }

  //   if (location) {
  //     queryBuilder.andWhere('event.location LIKE :location', {
  //       location: `%${location}%`,
  //     });
  //   }

  //   if (address) {
  //     queryBuilder.andWhere('event.address LIKE :address', {
  //       address: `%${address}%`,
  //     });
  //   }

  //   if (eventVisibility) {
  //     queryBuilder.andWhere('event.eventVisibility = :eventVisibility', {
  //       eventVisibility,
  //     });
  //   }

  //   if (eventStatus) {
  //     queryBuilder.andWhere('event.eventStatus = :eventStatus', {
  //       eventStatus,
  //     });
  //   }

  //   if (eventStartDateAndTime) {
  //     queryBuilder.andWhere('event.eventDate >= :eventStartDateAndTime', {
  //       eventStartDateAndTime,
  //     });
  //   }

  //   return queryBuilder;
  // }

  findMyEvents(req: Request, user: TJwtPayload) {
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
      pastPublishedEvents,
    } = query;

    const userId = user.userId;
    const queryBuilder = this.eventRepo.createQueryBuilder('event');
    queryBuilder
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.tickets', 'tickets')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('team.members', 'teamMembers')
      .leftJoinAndSelect('teamMembers.user', 'teamMember')
      .leftJoinAndSelect('teamMembers.permissions', 'permissions')
      .leftJoinAndSelect('permissions.team', 'permissionTeam');

    //select event where user is the owner or a team member
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('event.user = :userId', { userId }).orWhere(
          'teamMember.id = :userId',
          { userId },
        );
      }),
    );

    if (name)
      queryBuilder.andWhere('event.name ILIKE :name', { name: `%${name}%` });

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
        publishedStatus: 'published',
      });
    }

    queryBuilder.orderBy('event.createdAt', 'DESC');
    return queryBuilder;
  }

  async findOne(id: string, user: TJwtPayload) {
    const event = await this.entityManager.findOne(Event, {
      where: { id },
      relations: [
        'user',
        'tickets',
        'team',
        'team.members',
        'team.members.user',
        'team.members.permissions',
        'team.members.permissions.team',
      ],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isOwner = event.user?.id === user?.userId;
    const isTeamMember = event.team?.members?.some(
      (member) => member?.user?.id === user?.userId,
    );

    //check if event belongs to existing user
    if (!isOwner && !isTeamMember) {
      throw new BadRequestException(
        'User is neither the event owner nor a team member',
      );
    }

    return event;
  }

  async findOneForAttendee(slug: string, userId?: string) {
    const event = await this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('user.publicProfile', 'publicProfile')
      .leftJoinAndSelect('event.tickets', 'tickets')
      .where('event.slug = :slug', { slug })
      .andWhere(
        new Brackets((qb) => {
          qb.where('event.eventStatus = :publishedStatus', {
            publishedStatus: 'published',
          });
        }),
      )
      .getOne();

    if (!event) throw new NotFoundException('Event not found');

    // update the views
    await this.updateView(event, userId);
    // return the found event
    return event;
  }

  async updateView(event: Event, userId?: string) {
    let user: User;
    if (userId) {
      user = await this.userService.findOne(userId);
      if (!user) throw new NotFoundException('User not found');
    }

    let existingView: EventView;

    if (user) {
      // check if the view already exist
      existingView = await this.entityManager.findOne(EventView, {
        where: { event: { id: event.id }, user: { id: user.id } },
      });
    }

    if (existingView) {
      existingView.updatedAt = new Date();
      await this.entityManager.save(EventView, existingView);
      return;
    }

    const view = this.entityManager.create(EventView, { event, user });
    await this.entityManager.save(EventView, view);
    return;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const timestampInSeconds = `-${Math.floor(Date.now() / 1000)}`;
    const { name } = updateEventDto;

    // check if event exists and belongs to authenticated user
    const event = await this.entityManager.findOne(Event, {
      where: { id },
      relations: [
        'user',
        'tickets',
        'team',
        'team.members',
        'team.members.user',
        'team.members.permissions',
        'team.members.permissions.team',
      ],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // check if update has image.
    //upload image
    let eventImageURL = event.eventImageURL;
    if (updateEventDto.eventCoverImage) {
      eventImageURL = await this.uploadImage(updateEventDto.eventCoverImage);
      await this.deleteImage(event.eventImageURL);
    }

    let slugExists: Event;
    let slug: string = event.slug;
    // check if name is part of the payload
    if (name) {
      // check if name already exists
      slugExists = await this.eventRepo
        .createQueryBuilder('event')
        .where('event.slug = :slug', { slug: slugify(name, { lower: true }) })
        // .andWhere('event.userId != :userId', { userId: user.userId })
        .getOne();

      slug = `${slugify(name, { lower: true })}${slugExists ? timestampInSeconds : ''}`;
    }

    // update event
    const updatedEvent = await this.entityManager.transaction(
      async (manager) => {
        const { eventCoverImage, tickets, ...rest } = updateEventDto;
        const updatedFields = {
          ...rest,
          slug,
          eventImageURL,
        };

        this.validateEventCreation(
          event.user,
          updatedFields.eventVisibility
            ? updatedFields.eventVisibility
            : event.eventVisibility,
          updatedFields.eventStatus
            ? updatedFields.eventStatus
            : event.eventStatus,
        );

        Object.assign(event, updatedFields);

        return await manager.save<Event>(event);
      },
    );
    // return updated event
    return updatedEvent;
  }

  /**
   * A method to find all events in the database based on some query parameters
   * @param params this is an object containing key value pairs of query parameters
   * @returns the list of events
   */
  async findAll(params?: { [key: string]: any }) {
    const today = new Date();
    const todayISO = today.toISOString();
    const queryBuilder = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.tickets', 'tickets');

    // Base conditions
    queryBuilder.where('event.eventVisibility = :publicVisibility', {
      publicVisibility: 'public',
    });
    queryBuilder.andWhere('event.eventStatus = :publishedStatus', {
      publishedStatus: 'published',
    });

    if (params) {
      // Date range filters
      if (params['eventStartDateAndTime'] && params['eventEndDateAndTime']) {
        queryBuilder.andWhere(
          'event.eventStartDateAndTime <= :end AND event.eventEndDateAndTime >= :start',
          {
            start: params['eventStartDateAndTime'],
            end: params['eventEndDateAndTime'],
          },
        );
      } else if (params['eventStartDateAndTime']) {
        queryBuilder.andWhere(
          'event.eventStartDateAndTime >= :eventStartDate',
          {
            eventStartDate: params['eventStartDateAndTime'],
          },
        );
      } else if (params['eventEndDateAndTime']) {
        queryBuilder.andWhere('event.eventEndDateAndTime <= :eventEndDate', {
          eventEndDate: params['eventEndDateAndTime'],
        });
      }

      // Search conditions (tags, name, location)
      const searchConditions: string[] = [];
      const searchParams: any = {};

      if (params['tags']) {
        searchConditions.push(
          `regexp_split_to_array(event.tags, '[,\\s]+') @> ARRAY[:tag]`,
        );
        searchParams.tag = params['tags'];
      }

      if (params['name']) {
        searchConditions.push('event.name ILIKE :searchName');
        searchParams.searchName = `%${params['name']}%`;
      }

      if (params['locationName']) {
        searchConditions.push('event.locationName ILIKE :searchLocation');
        searchParams.searchLocation = `%${params['locationName']}%`;
      }

      // Combine search conditions with OR
      if (searchConditions.length > 0) {
        queryBuilder.andWhere(
          `(${searchConditions.join(' OR ')})`,
          searchParams,
        );
      }

      // Geolocation search
      if (params['latitude'] && params['longitude']) {
        const radius = 5000;
        const lat = parseFloat(params['latitude']);
        const lon = parseFloat(params['longitude']);

        queryBuilder
          .andWhere(
            '(CAST(event.latitude AS float) != 0 OR CAST(event.longitude AS float) != 0)',
          )
          .addSelect(
            `(
            6371 * acos(
              least(1::float, 
                cos(radians(:lat::float)) * 
                cos(radians(CAST(event.latitude AS float))) * 
                cos(radians(CAST(event.longitude AS float)) - radians(:lon::float)) + 
                sin(radians(:lat::float)) * 
                sin(radians(CAST(event.latitude AS float)))
              )
            )
          )`,
            'distance',
          )
          .addSelect('event.latitude', 'event_latitude')
          .addSelect('event.longitude', 'event_longitude')
          .andWhere(
            `(
            6371 * acos(
              least(1::float, 
                cos(radians(:lat::float)) * 
                cos(radians(CAST(event.latitude AS float))) * 
                cos(radians(CAST(event.longitude AS float)) - radians(:lon::float)) + 
                sin(radians(:lat::float)) * 
                sin(radians(CAST(event.latitude AS float)))
              )
            ) <= :radius
            OR (CAST(event.latitude AS float) = :lat AND CAST(event.longitude AS float) = :lon)
          )`,
            { lat, lon, radius },
          )
          .andWhere(
            'event.latitude IS NOT NULL AND event.longitude IS NOT NULL',
          )
          .orderBy('distance', 'ASC');
      }
    }
    return queryBuilder;
  }

  async remove(id: string, user: TJwtPayload) {
    //check if event exists and belongs to authenticated user
    const event = await this.findOne(id, user);
    const userEntity = await this.userService.findOne(user.userId);

    //delete event and it's related tickets
    await this.entityManager.transaction(async (manager) => {
      await manager.delete(Ticket, { event: { id: event.id } });
      await manager.delete(Event, id);
      userEntity.numOfEventsCreated--;
      await manager.save(User, userEntity);
      await this.deleteImage(event.eventImageURL);
    });
    return;
  }

  async assignTeam(body: AssignTeamDto, eventId: string, userId: string) {
    // get the teamId from the body
    const { teamId } = body;

    // find the event
    const event = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.id = :eventId', { eventId })
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .getOne();

    if (!event) throw new NotFoundException('Event not found');

    // check if the event belongs to the user
    if (event.user.id !== userId)
      throw new BadRequestException(
        'Event does not belong to authenticated user',
      );

    // // check if the event already has a team
    return await this.entityManager.transaction(async (manager) => {
      // unassign the tasks of the team
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ assignee: null })
        .where('eventId = :eventId', { eventId: event.id })
        .execute();

      // find the team
      const team = await manager.findOneBy(Team, { id: teamId });
      if (!team) throw new NotFoundException('Team not found');

      // assign the team to the event
      event.team = team;
      return await manager.save(Event, event);
    });
  }

  async deallocateTeam(eventId: string, userId: string) {
    // get the teamId from the body
    // const { teamId } = body;

    // find the event
    const event = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.id = :eventId', { eventId })
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('event.user', 'user')
      .getOne();

    if (!event) throw new NotFoundException('Event not found');

    // check if the event belongs to the user
    if (event.user.id !== userId)
      throw new BadRequestException(
        'Event does not belong to authenticated user',
      );

    return await this.entityManager.transaction(async (manager) => {
      // unassign the tasks of the team
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ assignee: null })
        .where('eventId = :eventId', { eventId: event.id })
        .execute();

      event.team = null;
      await manager.save(Event, event);
      return true;
    });
  }
}
