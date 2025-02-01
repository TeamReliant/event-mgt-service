import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
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
  @Min(0)
  @FormatValidationException()
  intendedBudget: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @FormatValidationException()
  amountSpent: number;
}
