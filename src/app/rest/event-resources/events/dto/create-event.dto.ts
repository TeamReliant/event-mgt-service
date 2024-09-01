import { MaxArrayLength } from '@libs/decorators/max-array-length-validator';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EventStatus, EventVisibility } from '../enums';
import { IsFutureDate } from '@libs/decorators/date-validator.decorator';
import { Type } from 'class-transformer';
import { IsFile, MaxFileSize } from 'nestjs-form-data';
import { CreateTicketDto } from '@app/rest/ticket-resources/tickets/dto/create-ticket.dto';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  description: string;

  // @IsNotEmpty()
  // @IsFile()
  // @MaxFileSize(2 * 1024 * 1024)
  eventCoverImage: any;

  @IsArray({message: "Field must be an array"})
  @MaxArrayLength(10, {message: "Tags can contain at most 10 items"})
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

  @IsDate()
  @IsNotEmpty()
  @IsFutureDate()
  @Type(() => Date)
  eventStartDate: Date;

  @IsDate()
  @IsOptional()
  @IsFutureDate()
  @Type(() => Date)
  eventEndDate: Date;

  @IsString()
  eventStartTime: string;

  @IsOptional()
  @IsString()
  eventEndTime: string;

  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => CreateTicketDto)
  tickets?: CreateTicketDto[];
}
