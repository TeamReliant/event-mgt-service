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
import { EntityManager, Repository } from 'typeorm';
import { AzureBlobFileSystemService } from '@libs/services/file-system/implementations/azure/azure-blob-file-system.service';
import { Ticket } from '@app/rest/ticket-resources/tickets/entities/ticket.entity';
import { TJwtPayload } from '@libs/types';
import { User } from '@app/rest/users/entities/user.entity';
import { Request } from 'express';
import { AssignTeamDto } from '@app/rest/event-resources/events/dto/assign-team.dto';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    private readonly entityManager: EntityManager,
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

  async create(createEventDto: CreateEventDto, user: TJwtPayload) {
    let eventImageURL: string;
    try {
      const { eventCoverImage, tickets, ...rest } = createEventDto;
      if (eventCoverImage) {
        eventImageURL = await this.uploadImage(eventCoverImage);
      }
      const createdEvent = await this.entityManager.transaction(
        async (manager) => {
          //eventCreator: user creating the event
          const eventCreator = await manager.findOne(User, {
            where: { id: user.userId },
          });

          if (!eventCreator) {
            throw new NotFoundException('User not found');
          }

          const eventInstance = manager.create(Event, {
            ...rest,
            eventImageURL,
            user: eventCreator,
          });
          if (tickets && tickets.length > 0) {
            eventInstance.tickets = tickets.map((ticket) =>
              manager.create(Ticket, ticket),
            );
          }

          return await manager.save<Event>(eventInstance);
        },
      );
      return createdEvent;
    } catch (error) {
      //if saving of event fails, delete the uploaded image
      await this.deleteImage(eventImageURL);
      console.error('Error creating event:', error);
      throw new BadRequestException('Error creating event');
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
  //     eventStartDate,
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

  //   if (eventStartDate) {
  //     queryBuilder.andWhere('event.eventDate >= :eventStartDate', {
  //       eventStartDate,
  //     });
  //   }

  //   return queryBuilder;
  // }

  findMyEvents(req: Request, user: TJwtPayload) {
    const { query } = req;
    const {
      name,
      location,
      address,
      eventVisibility,
      eventStatus,
      eventStartDate,
    } = query;

    const userId = user.userId;
    const queryBuilder = this.eventRepo.createQueryBuilder('event');
    queryBuilder.leftJoinAndSelect('event.tickets', 'ticket');
    queryBuilder.andWhere('event.user = :userId', { userId });

    if (name) {
      queryBuilder.andWhere('event.name LIKE :name', { name: `%${name}%` });
    }

    if (location) {
      queryBuilder.andWhere('event.location LIKE :location', {
        location: `%${location}%`,
      });
    }

    if (address) {
      queryBuilder.andWhere('event.address LIKE :address', {
        address: `%${address}%`,
      });
    }

    if (eventVisibility) {
      queryBuilder.andWhere('event.eventVisibility = :eventVisibility', {
        eventVisibility,
      });
    }

    if (eventStatus) {
      queryBuilder.andWhere('event.eventStatus = :eventStatus', {
        eventStatus,
      });
    }

    if (eventStartDate) {
      queryBuilder.andWhere('event.eventDate >= :eventStartDate', {
        eventStartDate,
      });
    }

    return queryBuilder;
  }

  async findOne(id: string, user: TJwtPayload) {
    try {
      const event = await this.entityManager.findOne(Event, {
        where: { id },
        relations: ['user', 'tickets', 'team'],
      });
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      //check if event belongs to existing user
      if (event.user.id !== user.userId) {
        throw new UnauthorizedException(
          'Event does not belong to authenticated user',
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
    try {
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

          //preserve existing tickets and user
          event.tickets = event.tickets;
          event.user = event.user;
          return await manager.save<Event>(event);
        },
      );
      // return updated event
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event: ', error.message);
      throw new BadRequestException('Error updating event');
    }
  }

  async remove(id: string, user: TJwtPayload) {
    try {
      //check if event exists and belongs to authenticated user
      const event = await this.findOne(id, user);

      //delete event and it's related tickets
      await this.entityManager.transaction(async (manager) => {
        await manager.delete(Event, id);
        await this.deleteImage(event.eventImageURL);
      });
      return;
    } catch (error) {
      console.error('Error deleting event: ', error.message);
      throw new BadRequestException('Error deleting event. Please try again');
    }
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
