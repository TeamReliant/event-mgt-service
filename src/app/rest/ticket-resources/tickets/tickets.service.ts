import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TJwtPayload } from '@libs/types';
import { EventsService } from '@app/rest/event-resources/events/events.service';
import { EntityManager, ILike, Like, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly eventService: EventsService,
    private readonly entityManager: EntityManager,
  ) {}
  async create(
    createTicketDto: CreateTicketDto,
    eventId: string,
    user: TJwtPayload,
  ) {
    try {
      const event = await this.eventService.findOne(eventId, user);

      const existingTicket = await this.ticketRepository.findOne({
        where: {
          name: createTicketDto.name,
          event: { id: event.id },
        },
      });

      if (existingTicket) throw new BadRequestException('Ticket already exists');


      const ticket = this.ticketRepository.create({
        ...createTicketDto,
        event: event,
      });

      const savedTicket = await this.entityManager.transaction(
        async (manager) => {
          const newTicket = await manager.save<Ticket>(ticket);
          event.tickets.push(newTicket);
          await manager.save<Event>(event);
          return newTicket;
        },
      );

      return savedTicket;
    } catch (error) {
      if (error instanceof BadRequestException) {
        console.error('Error creating ticket: ', error.message);
        throw error;
      }
      console.error('Error creating ticket: ', error.message);
      throw new InternalServerErrorException(
        'Error creating ticket, please try again',
      );
    }
  }

  async findOne(ticketId: string, user: TJwtPayload) {
    try {
      const ticket = await this.ticketRepository.findOne({
        where: { id: ticketId },
        relations: ['event'],
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      const eventId = ticket.event?.id;

      if (!eventId) {
        throw new BadRequestException('Ticket does not belong to any event');
      }

      //checks if event belongs to the user
      await this.eventService.findOne(eventId, user);

      return ticket;
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.error('Error retrieving ticket: ', error.message);
        throw error;
      }
      console.error('Error fetching ticket: ', error.message);
      throw new BadRequestException('Error fetching ticket, please try again');
    }
  }
  async findAll(eventId: string, user: TJwtPayload) {
    try {
      await this.eventService.findOne(eventId, user);

      const tickets = await this.ticketRepository.find({
        where: {
          event: { id: eventId },
        },
      });

      return tickets;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Error fetching tickets, please try again');
    }
  }

  async update(
    ticketId: string,
    updateTicketDto: UpdateTicketDto,
    user: TJwtPayload,
  ) {
    try {
      const ticket = await this.findOne(ticketId, user);

      Object.assign(ticket, updateTicketDto);

      const updatedTicket = await this.entityManager.transaction(
        async (manager) => {
          return await manager.save<Ticket>(ticket);
        },
      );
      return updatedTicket;
    } catch (error) {
      console.error(error);
      throw new BadRequestException('Error updating ticket, please try again');
    }
  }

  async remove(ticketId: string, user: TJwtPayload) {
    const ticket = await this.findOne(ticketId, user);

    await this.entityManager.transaction(async (manager) => {
      const deletedResult = await manager.remove(ticket);

      if (!deletedResult) {
        throw new BadRequestException(
          `Ticket with ${ticketId} could not be deleted`,
        );
      }
    });
  }
}
