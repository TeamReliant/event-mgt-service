import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';

export class FetchTasksQueriesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @FormatValidationException()
  search: string;
}
