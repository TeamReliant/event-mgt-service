import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class SendComplimentaryBookingDto {
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

  @IsNotEmpty()
  @IsUUID()
  @FormatValidationException()
  ticketId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @FormatValidationException()
  quantity: number;
}
