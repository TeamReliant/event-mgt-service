import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CheckGuestDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  bookingId: string;

  @IsNotEmpty()
  @IsEnum(['in', 'out'], {
    message: 'Check must be either in or out',
  })
  @FormatValidationException()
  check: string;
}
