import { MaxArrayLength } from '@libs/decorators/max-array-length-validator';
import {
  IsArray,
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EventStatus, EventVisibility } from '../enums';
import { IsDateAfter, IsFutureDate } from '@libs/decorators/date-validator.decorator';
import { Type } from 'class-transformer';
import { CreateTicketDto } from '@app/rest/ticket-resources/tickets/dto/create-ticket.dto';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @FormatValidationException()
  name: string;

  @IsNotEmpty()
  @IsString()
  locationName: string;

  @IsNotEmpty()
  @IsString()
  locationPlaceId: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  googleMapUrl: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  additionalInfo: string;

  @IsOptional()
  @FormatValidationException()
  eventCoverImage: any;

  @IsArray({ message: 'Field must be an array' })
  @MaxArrayLength(10, { message: 'Tags can contain at most 10 items' })
  @IsOptional()
  tags: string[];

  @IsEnum(EventVisibility)
  @IsNotEmpty()
  @IsOptional()
  eventVisibility: EventVisibility;

  @IsEnum(EventStatus)
  @IsNotEmpty()
  @IsOptional()
  eventStatus: EventStatus;

  
  @ValidateIf((o) => o.eventStartDateAndTime !== undefined)
  @IsNotEmpty()
  @IsDateString()
  @IsFutureDate()
  @FormatValidationException()
  eventStartDateAndTime: Date;

  @ValidateIf((o) => o.eventEndDateAndTime !== undefined)
  @IsNotEmpty()
  @IsDateString()
  @IsDateAfter('eventStartDateAndTime',{
    message: 'eventEndDateAndTime must be after eventStartDateAndTime',
  })
  @FormatValidationException()
  eventEndDateAndTime: Date;

  @IsOptional()
  @IsString()
  timeZone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => CreateTicketDto)
  tickets?: CreateTicketDto[];
}
