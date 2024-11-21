import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';
import { Transform } from 'class-transformer';

export class FetchEventAnalyticsQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeStart: Date;

  @IsOptional()
  @Transform(({ value }) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  })
  @IsDate()
  dateRangeEnd: Date;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'Range must be either daily, weekly or monthly',
  })
  @FormatValidationException()
  range: string = 'weekly';
}
