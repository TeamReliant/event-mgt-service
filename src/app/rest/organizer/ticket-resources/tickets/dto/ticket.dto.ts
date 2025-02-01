import { EventResponseDto } from '@app/rest/organizer/event-resources/events/dto/event.dto';
import { UserDto } from '@app/rest/users/dto/shared/user.dto';
import { Expose, Type } from 'class-transformer';
import { TicketCategory } from '../enums';

export class TicketDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  category: TicketCategory;

  @Expose()
  description: string;

  @Expose()
  isAvailable: boolean;

  @Expose()
  availableTickets: number;

  @Expose()
  maxNumberOfTicketsOrderable: number;

  @Expose()
  minNumberOfTicketsOrderable: number;

  @Expose()
  numberOfTicketsSold: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Type(() => EventResponseDto)
  @Expose()
  event: EventResponseDto;

  @Type(() => UserDto)
  @Expose()
  user: UserDto;

  constructor(partial: Partial<TicketDto>) {
    Object.assign(this, partial);
  }
}
