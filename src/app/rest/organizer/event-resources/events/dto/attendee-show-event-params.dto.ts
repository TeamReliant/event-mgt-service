import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AttendeeShowEventParamsDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  @FormatValidationException()
  slug: string;
}
