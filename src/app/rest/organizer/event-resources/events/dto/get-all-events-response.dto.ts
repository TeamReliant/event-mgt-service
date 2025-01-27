import { Expose, Type } from 'class-transformer';
import { EventStatus, EventVisibility } from '../enums';
import { UserDto } from '@app/rest/users/dto/shared/user.dto';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { TeamDto } from '@app/rest/organizer/team-resources/teams/dto/team.dto';

export class GetAllEventsResponseDto {
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
  slug?: string;

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
  tickets: Ticket[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  eventStartDateAndTime?: string;

  @Expose()
  eventEndDateAndTime?: string;

  @Expose()
  timeZone?: string;

  @Expose()
  totalNumberOfTicketsSold?: string;

  @Expose()
  isAvailable: boolean;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;

  // @Expose()
  // @Type(() => TicketDto)
  // tickets?: TicketDto;

  @Expose()
  @Type(() => TeamDto)
  team?: TeamDto;
}
