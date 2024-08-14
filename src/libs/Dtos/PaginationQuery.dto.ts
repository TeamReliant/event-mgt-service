import { IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  readonly page: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  readonly perPage: number = 10;

  // @IsOptional()
  // sortBy: string | number;
  //
  // @IsOptional()
  // filters: Record<string, any> = {}
}
