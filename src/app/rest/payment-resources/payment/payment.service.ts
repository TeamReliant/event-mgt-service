import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { EntityManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { TJwtPayload } from '@libs/types';
import { PaymentStrategyResolver } from './strategies/shared/payment-strategy.resolver';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import Stripe from 'stripe';
import { TransactionsService } from '@app/rest/transaction-resources/transactions/transactions.service';
import { plainToInstance } from 'class-transformer';
import { CreateTransactionDto } from '@app/rest/transaction-resources/transactions/dto/create-transaction.dto';
import { User } from '@app/rest/users/entities/user.entity';
import { Transaction } from '@app/rest/transaction-resources/transactions/entities/transaction.entity';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  constructor(
    private readonly userService: UsersService,
    private readonly transactionService: TransactionsService,
    private readonly paymentStrategyResolver: PaymentStrategyResolver,
    private readonly entityManager: EntityManager,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  private async validateUserType(user: TJwtPayload, userType: string) {
    const currUser = await this.userService.findOne(user.userId);
    if (currUser.userType !== userType) {
      throw new UnauthorizedException(
        `Only ${userType}s can perform this action`,
      );
    }

    return currUser;
  }
  async createSessions(user: TJwtPayload, paymentMethod: string) {
    try {
      const paymentStrategy =
        this.paymentStrategyResolver.getStrategy(paymentMethod);
      const currUser = await this.validateUserType(user, 'organizer');

      if (!currUser.stripeConnectedAccountId) {
        const { accountId, clientSecret } =
          await paymentStrategy.createSessions(currUser.email);

        currUser.stripeConnectedAccountId = accountId;
        await this.userService.findOneByIdAndUpdate(currUser.id, currUser);

        return clientSecret;
      }

      //if the user already has a connected account, create account link
      const { clientSecret } = await paymentStrategy.createSessions(
        currUser.email,
        currUser.stripeConnectedAccountId
      );
      
      return clientSecret;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        console.error(error.message);
        throw error;
      }
      console.error(error.message);
      throw new Error('Error creating connected account');
    }
  }

  async createCustomer(user: TJwtPayload, method: string) {
    try {
      const currUser = await this.validateUserType(user, 'organizer');

      const paymentStrategy = this.paymentStrategyResolver.getStrategy(method);

      const customer = await paymentStrategy.createCustomer(
        currUser.email,
        `${currUser.firstname} ${currUser.lastname}`,
      );
      currUser.customerId = customer.id;
      await this.userService.findOneByIdAndUpdate(currUser.id, currUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        console.error('Error creating customer account:', error.message);
        throw error;
      }
      console.error(error.message);
      throw new Error('Error creating customer account');
    }
  }

  async createSubscription(
    user: TJwtPayload,
    createSubDto: CreateSubscriptionDto,
    paymentMethod: string,
  ) {
    try {
      const paymentStrategy =
        this.paymentStrategyResolver.getStrategy(paymentMethod);
      const currUser = await this.validateUserType(user, 'organizer');
      if (!currUser.customerId) {
        await this.createCustomer(user, paymentMethod);
      }

      const session = await paymentStrategy.createSubscription(
        currUser.customerId,
        createSubDto.plan,
      );

      currUser.sessionId = session.id;
      await this.userService.findOneByIdAndUpdate(currUser.id, currUser);
      return { statusCode: 303, sessionUrl: session.url };
    } catch (error) {
      console.error(error.message);
      throw new Error('Error creating subscription');
    }
  }

  async updateSubscription(user: TJwtPayload, paymentMethod: string) {
    const paymentStrategy =
      await this.paymentStrategyResolver.getStrategy(paymentMethod);
    const currUser = await this.validateUserType(user, 'organizer');

    if (!currUser.sessionId) {
      throw new Error('No active subscription found');
    }

    const session = await paymentStrategy.updateSubscription(
      currUser.sessionId,
    );
    currUser.updateSessionId = session.id;
    await this.userService.findOneByIdAndUpdate(currUser.id, currUser);
    return { statusCode: 303, sessionUrl: session.url };
  }

  async handlePaymentSucceeded(event: Stripe.Event) {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;

      //get the email of the customer from the subscription
      const customer = await this.stripe.customers.retrieve(
        subscription.customer as string,
      );
      const customerEmail = (customer as Stripe.Customer).email;

      if (!customerEmail) {
        throw new Error('Customer Email not found');
      }
      //get the user from the database using the email
      const user = await this.userService.findOneByEmail(customerEmail);
      if (!user) {
        throw new Error('User not found in the database');
      }

      const plan = subscription.items.data[0].plan;
      const product = await this.stripe.products.retrieve(
        plan.product as string,
      );
      const planName = product.name;
      //update the status of the user and the plan subscribed for
      user.subscriptionStatus = status;
      user.subscribedPlan = planName;

      await this.entityManager.transaction(async (manager) => {
        await manager.update(User, user.id, user);
        const transactionObj = {
          plan: planName,
          userId: user.id,
          amount: plan.amount / 100,
          currency: plan.currency,
          transactionId: subscription.latest_invoice,
          paymentMethod: subscription.default_payment_method || 'card',
          status: 'succeeded',
          subscriptionId: subscription.id,
        };

        const transaction = plainToInstance(
          CreateTransactionDto,
          transactionObj,
        );
        await manager.save(Transaction, transaction);

        //TODO notify user of successful payment
      });
    } catch (error) {
      console.error('Error handling payment succeeded event', error.message);
      //TODO notify admin of error
    }
  }

  async handlePaymentFailed(event: Stripe.Event) {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      const customer = await this.stripe.customers.retrieve(
        invoice.customer as string,
      );
      const customerEmail = (customer as Stripe.Customer).email;

      if (!customerEmail) {
        throw new Error('Customer email not found');
      }

      const user = await this.userService.findOneByEmail(customerEmail);
      if (!user) {
        throw new Error('User not found in the database');
      }

      user.subscriptionStatus = 'past_due';

      await this.entityManager.transaction(async (manager) => {
        await manager.update(User, user.id, user);

        const failureReason =
          invoice.payment_intent && typeof invoice.payment_intent !== 'string'
            ? invoice.payment_intent?.last_payment_error?.message ||
              'Payment failed'
            : 'Payment failed';

        const transactionObj = {
          userId: user.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          transactionId: invoice.id,
          paymentMethod: invoice.default_payment_method || 'card',
          status: 'failed',
          failureReason: failureReason,
        };
        const transaction = plainToInstance(
          CreateTransactionDto,
          transactionObj,
        );

        await manager.save(Transaction, transaction);

        //TODO notify user of the failed payment via email
      });
    } catch (error) {
      console.error('Error handling payment failed event', error.message);
      //TODO notify admin about the failure to handle failed payment via email
    }
  }

  findAll() {
    return `This action returns all payment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
