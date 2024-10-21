import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { Ticket } from '@app/rest/ticket-resources/tickets/entities/ticket.entity';
import { TJwtPayload } from '@libs/types';
import { User } from '@app/rest/users/entities/user.entity';
import { Request } from 'express';
import { AssignTeamDto } from '@app/rest/event-resources/events/dto/assign-team.dto';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { UsersService } from '@app/rest/users/users.service';

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

  private getEventCreatedThisMonth(user: User) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return user.events.filter(event => {
      const eventDate = new Date(event.createdAt);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
  }).length;
  }

  private validateEventCreation(user: User, eventVisibility: string) {
    const { subscribedPlan, numOfEventsCreated, numOfPrivateEventsCreated } =
      user;

    const plan = subscribedPlan.toLowerCase();
    const visibility = eventVisibility.toLowerCase();

    const planRestrictions = {
      free: { maxEvents: 4, maxPrivateEvents: 0 },
      pro: { maxEvents: 8, maxPrivateEvents: 5 },
      premium: { maxEvents: Infinity, maxPrivateEvents: Infinity },
    };

    const { maxEvents, maxPrivateEvents } = planRestrictions[plan];
    const eventsCreatedThisMonth = this.getEventCreatedThisMonth(user);

    if (plan === 'free' && visibility === 'private') {
      throw new UnauthorizedException(
        'Free plan users cannot create private events',
      );
    }

    if (
      visibility === 'private' &&
      numOfPrivateEventsCreated >= maxPrivateEvents
    ) {
      throw new UnauthorizedException(
        'Private event limit exceeded for this user',
      );
    }

    if (eventsCreatedThisMonth >= maxEvents) {
      throw new UnauthorizedException(
        'Monthly event creation limit exceeded for this user',
      );
    }

    if (visibility === 'private') {
      user.numOfPrivateEventsCreated++;
    }

    user.numOfEventsCreated++;
  }

  async create(createEventDto: CreateEventDto, user: TJwtPayload) {
    let eventImageURL: string;
    try {
      const { eventCoverImage, tickets, eventVisibility, ...rest } =
        createEventDto;
      if (eventCoverImage) {
        eventImageURL = await this.uploadImage(eventCoverImage);
      }
      const createdEvent = await this.entityManager.transaction(
        async (manager) => {
          //eventCreator: user creating the event
          const eventCreator = await this.userService.findOne(user.userId);

          if (!eventCreator) {
            throw new NotFoundException('User not found');
          }

          this.validateEventCreation(eventCreator, eventVisibility);

          const eventInstance = manager.create(Event, {
            ...rest,
            eventImageURL,
            eventVisibility,
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
        error instanceof UnauthorizedException ||
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
    } = query;

    const userId = user.userId;
    const queryBuilder = this.eventRepo.createQueryBuilder('event');
    queryBuilder
      .leftJoinAndSelect('event.user', 'user')
      .leftJoinAndSelect('event.tickets', 'tickets')
      .leftJoinAndSelect('event.team', 'team')
      .leftJoinAndSelect('team.members', 'teamMember');

    //select event where user is the owner or a team member
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('event.user = :userId', { userId }).orWhere(
          'teamMember.user.id = :userId',
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

    return queryBuilder;
  }

  async findOne(id: string, user: TJwtPayload) {
    try {
      const event = await this.entityManager.findOne(Event, {
        where: { id },
        relations: [
          'user',
          'tickets',
          'team',
          'team.members',
          'team.members.user',
        ],
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      const isOwner = event.user.id === user.userId;
      const isTeamMember = event.team?.members?.some(
        (member) => member.user.id === user.userId,
      );

      //check if event belongs to existing user
      if (!isOwner && !isTeamMember) {
        throw new UnauthorizedException(
          'User is neither the event owner nor a team member',
        );
      }
      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error('Error retrieving event: ', error.message);
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        console.error('Error retrieving event: ', error.message);
        throw error;
      }
      console.error('Unexpected error retrieving event: ', error.message);
      throw new InternalServerErrorException(
        'Unexpected error occurred while retrieving event',
      );
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto, user: TJwtPayload) {
    // check if event exists and belongs to authenticated user
    const event = await this.findOne(id, user);
    // check if update has image.
    //upload image
    let eventImageURL = event.eventImageURL;
    if (updateEventDto.eventCoverImage) {
      eventImageURL = await this.uploadImage(updateEventDto.eventCoverImage);
      await this.deleteImage(event.eventImageURL);
    }

    // update event
    const updatedEvent = await this.entityManager.transaction(
      async (manager) => {
        const { eventCoverImage, tickets, ...rest } = updateEventDto;
        const updatedFields = {
          ...rest,
          eventImageURL,
        };

        Object.assign(event, updatedFields);

          return await manager.save<Event>(event);
        },
      );
      // return updated event
      return updatedEvent;
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
      throw new UnauthorizedException(
        'Event does not belong to authenticated user',
      );

    // check if the event already has a team
    if (event.team)
      throw new NotAcceptableException('Event already has a team');

    // find the team
    const team = await this.entityManager.findOneBy(Team, { id: teamId });
    if (!team) throw new NotFoundException('Team not found');

    // assign the team to the event
    event.team = team;
    return await this.eventRepo.save(event);
  }
}
