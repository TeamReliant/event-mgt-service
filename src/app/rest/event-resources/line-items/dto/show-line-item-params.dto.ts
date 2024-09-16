import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ShowLineItemParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  eventId: string;

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  id: string;
}
