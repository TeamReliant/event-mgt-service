import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignTaskParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  eventId: string;
}
