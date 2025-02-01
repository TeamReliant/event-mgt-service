import {
  IsDate,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';

export class FetchTasksQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  search: string;

  @IsOptional()
  @IsString()
  @IsDateString()
  @FormatValidationException()
  startDate: string;

  @IsOptional()
  @IsString()
  @IsDateString()
  @FormatValidationException()
  endDate: string;

  @IsOptional()
  @IsEnum(['lowest', 'low', 'medium', 'high', 'highest'], {
    message:
      'priority must be one of the following: lowest, low, medium, high, highest',
  })
  @FormatValidationException()
  priority: string;

  @IsOptional()
  @IsEnum(['pending', 'ongoing', 'completed'], {
    message: 'status must be one of the following: pending, ongoing, completed',
  })
  @FormatValidationException()
  status: string;
}
