import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class GetFeesDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @FormatValidationException()
  amount: number;
}
