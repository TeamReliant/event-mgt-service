import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendBroadcastMessageDto {
  @IsOptional()
  @IsEnum(['true', 'false'], {
    message: 'all should either be true or false as a string',
  })
  all: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, {
    each: true,
    message: 'Each element of the array must be a valid UUID',
  })
  @FormatValidationException()
  bookingIds: string[];

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  @FormatValidationException()
  message: string;
}
