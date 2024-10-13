import {
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { IsFutureDate } from '@libs/decorators/date-validator.decorator';

export class AssignTaskDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  title: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  @FormatValidationException()
  description: string;

  @IsOptional()
  @IsDate()
  @IsFutureDate()
  @FormatValidationException()
  dueDate: Date;

  @IsNotEmpty()
  @IsEnum(['lowest', 'low', 'medium', 'high', 'highest'], {
    message:
      'priority must be one of the following: lowest, low, medium, high, highest',
  })
  @FormatValidationException()
  priority: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  assigneeId: string;
}
