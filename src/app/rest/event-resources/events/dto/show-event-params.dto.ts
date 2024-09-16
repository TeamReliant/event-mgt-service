import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ShowEventParamsDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  @FormatValidationException()
  id: string;
}
