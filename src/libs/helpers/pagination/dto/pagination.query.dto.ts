import { IsOptional, IsPositive } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  // Number of entries to return
  limit?: number = 10;

  @IsOptional()
  @IsPositive()
  // Number of entries to skip from start
  page?: number = 1;
}
