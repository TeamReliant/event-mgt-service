import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitTicketDto)
  tickets?: UnitTicketDto[];

  @IsNotEmpty()
  @IsEmail()
  @FormatValidationException()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  lastName: string;
}

class UnitTicketDto {
  @IsNotEmpty()
  @IsUUID()
  @FormatValidationException()
  ticketId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @FormatValidationException()
  quantity: number;

  @IsNotEmpty()
  @IsEnum(TicketCategory, { message: 'category should either be paid or free' })
  @FormatValidationException()
  category: TicketCategory;

  @IsNotEmpty()
  @IsEnum(FreeTicketReaction, {
    message: 'ticket reaction should either be going, not going , or maybe',
  })
  @ValidateIf((object) => object.category === 'free')
  @FormatValidationException()
  reaction?: FreeTicketReaction;
}
