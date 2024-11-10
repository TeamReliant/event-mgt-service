import { Expose, Type } from 'class-transformer';
import { EventStatus, EventVisibility } from '../enums';
import { TicketDto } from '@app/rest/organizer/ticket-resources/tickets/dto/ticket.dto';
import { UserDto } from '@app/rest/users/dto/shared/user.dto';

export class EventResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  locationPlaceId: string;

  @Expose()
  locationName: string;

  @Expose()
  address: string;

  @Expose()
  googleMapUrl?: string;

  @Expose()
  latitude?: string;

  @Expose()
  longitude?: string;

  @Expose()
  description?: string;

  @Expose()
  additionalInfo?: string;

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
  eventStartDateAndTime?: Date;

  @Expose()
  eventEndDateAndTime?: Date;

  @Expose()
  timeZone?: string;

  @Expose()
  isAvailable: boolean;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  @Expose()
  @Type(() => TicketDto)
  tickets?: TicketDto;
}
