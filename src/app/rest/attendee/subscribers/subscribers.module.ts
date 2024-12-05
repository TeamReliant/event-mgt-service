import { Module } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscribersController } from './subscribers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscriber } from '@app/rest/attendee/subscribers/entities/subscriber.entity';
import { PaginationModule } from '@libs/helpers/pagination/pagination.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscriber]), PaginationModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
