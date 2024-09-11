import { Module } from '@nestjs/common';
import { PaginationService } from '@libs/helpers/pagination/pagination.service';

@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class PaginationModule {}
