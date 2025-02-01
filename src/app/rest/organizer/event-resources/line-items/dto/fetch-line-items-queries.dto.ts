import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';

export class FetchLineItemsQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  search: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  category: string;

  @IsOptional()
  @IsString()
  @IsEnum(['on-track', 'near-budget', 'over-budget'], {
    message: 'status shoule either be on-tack, near-budget, or over-budget',
  })
  @FormatValidationException()
  status: string;
}
