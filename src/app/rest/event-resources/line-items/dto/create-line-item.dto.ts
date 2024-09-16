import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class CreateLineItemDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @FormatValidationException()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @FormatValidationException()
  intendedBudget: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @FormatValidationException()
  amountSpent: number;
}
