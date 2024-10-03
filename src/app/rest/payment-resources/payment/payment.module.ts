import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripePaymentStrategy } from './strategies/stripe-payment.strategy';
import { UsersModule } from '@app/rest/users/users.module';
import { TransactionsModule } from '@app/rest/transaction-resources/transactions/transactions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { User } from '@app/rest/users/entities/user.entity';
import { Transaction } from '@app/rest/transaction-resources/transactions/entities/transaction.entity';
import { PaymentStrategyResolver } from './strategies/shared/payment-strategy.resolver';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, StripePaymentStrategy, PaymentStrategyResolver],
  exports: [PaymentService],
  imports: [TypeOrmModule.forFeature([Payment, Transaction, User]), UsersModule, TransactionsModule]
})
export class PaymentModule {}
