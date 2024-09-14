import { Expose, Type } from 'class-transformer';
import { EventStatus, EventVisibility } from '../enums';
import { TicketDto } from '@app/rest/ticket-resources/tickets/dto/ticket.dto';
import { UserDto } from '@app/rest/users/dto/shared/user.dto';

export class EventResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  location: string;

  @Expose()
  address: string;

  @Expose()
  description?: string;

  @Expose()
  tags?: string[];

  @Expose()
  eventImageURL?: string;

  @Expose()
  eventVisibility: EventVisibility;

  @Expose()
  eventStatus: EventStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  eventStartTime?: string;

  @Expose()
  eventEndTime?: string;

  @Expose()
  eventStartDate?: Date;

  @Expose()
  eventEndDate?: Date;

  @Expose()
  isAvailable: boolean;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  @Type(() => TicketDto)
  tickets: TicketDto;
}
