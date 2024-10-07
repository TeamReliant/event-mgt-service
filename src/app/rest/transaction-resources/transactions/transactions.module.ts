import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { UsersModule } from '@app/rest/users/users.module';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
  imports: [TypeOrmModule.forFeature([Transaction, User]), UsersModule],
  exports: [TransactionsService]
})
export class TransactionsModule {}
