import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { EntityManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { TJwtPayload } from '@libs/types';
import { PaymentStrategyResolver } from './strategies/shared/payment-strategy.resolver';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import Stripe from 'stripe';
import { plainToInstance } from 'class-transformer';
import { CreateTransactionDto } from '@app/rest/transaction-resources/transactions/dto/create-transaction.dto';
import { User } from '@app/rest/users/entities/user.entity';
import { Transaction } from '@app/rest/transaction-resources/transactions/entities/transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@config/app.config';
import { Payment } from './entities/payment.entity';
import { PaymentEvent } from './events/payment.event';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  constructor(
    private readonly userService: UsersService,
    private readonly paymentStrategyResolver: PaymentStrategyResolver,
    private readonly entityManager: EntityManager,
    private readonly eventEmitter: EventEmitter2,
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

  private async checkUserExists(email: string) {
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async getInvoiceAndUserFromStripeEvent(event: Stripe.Event) {
    const invoice = event.data?.object as Stripe.Invoice;
    if (!invoice) {
      throw new BadRequestException('Invoice data is missing');
    }

    //get the email of the customer from the invoice
    const customerEmail = invoice.customer_email;
    if (!customerEmail) {
      throw new NotFoundException('Customer Email not found');
    }
    //get the user from the database using the email
    const user = await this.checkUserExists(customerEmail);

    return { invoice, user };
  }

  private async createStripeConnectedAccountId(user: User)
  {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email: user.email,
    });

    user.stripeConnectedAccountId = account.id;
    await this.userService.findOneByIdAndUpdate(user.id, user);
  }

  async createSessions(user: TJwtPayload, paymentMethod: string) {
      const paymentStrategy =
        this.paymentStrategyResolver.getStrategy(paymentMethod);
      const currUser = await this.validateUserType(user, 'organizer');

      console.log(currUser.stripeConnectedAccountId);
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
        currUser.stripeConnectedAccountId,
      );

      return clientSecret;
  }

  async createCustomer(user: TJwtPayload, method: string) {
      const currUser = await this.validateUserType(user, 'organizer');

      const paymentStrategy = this.paymentStrategyResolver.getStrategy(method);

      const customer = await paymentStrategy.createCustomer(
        currUser.email,
        `${currUser.firstname} ${currUser.lastname}`,
      );
      currUser.customerId = customer.id;
      await this.userService.findOneByIdAndUpdate(currUser.id, currUser);
    } 
  

  

  async createSubscription(
    user: TJwtPayload,
    createSubDto: CreateSubscriptionDto,
    paymentMethod: string,
  ) {
      const paymentStrategy =
        this.paymentStrategyResolver.getStrategy(paymentMethod);
      const currUser = await this.validateUserType(user, 'organizer');
      if (!currUser.customerId) {
        await this.createCustomer(user, paymentMethod);
      }

      if (!currUser.stripeConnectedAccountId)
      {
        await this.createStripeConnectedAccountId(currUser);
      }

      if (currUser.subscriptionStatus === 'active' || currUser.subscriptionStatus === 'trialing')
      {
        const updatedUser = await this.updateSubscription(currUser, paymentMethod, createSubDto);
        return { statusCode: 200, data: updatedUser }
      }else {
        const session = await paymentStrategy.createSubscription(
          currUser.customerId,
          createSubDto.plan,);
          return { statusCode: 303, data: session.url };
      }

      
  }

  async updateSubscription(currUser: User, paymentMethod: string, createSubDto: CreateSubscriptionDto) {
      const paymentStrategy = await this.paymentStrategyResolver.getStrategy(paymentMethod);
  
      // Assuming you have the subscription ID stored in currUser.subscriptionId
      const updatedSubscription = await paymentStrategy.updateSubscription(currUser.subscriptionId, createSubDto.plan);
      if (!updatedSubscription) throw new InternalServerErrorException("An Error occured while updating subscription");

      const subscriptionEndDate = new Date(updatedSubscription.current_period_end * 1000);
      const subscriptionEndDateISO = subscriptionEndDate.toISOString();
      currUser.subscriptionEndDate = subscriptionEndDateISO;
      currUser.subscribedPlan = createSubDto.plan;

      const updatedUser = await this.userService.findOneByIdAndUpdate(currUser.id, currUser);
      if (!updatedUser) throw new InternalServerErrorException("User could not be updated with latest subscription data");
      return updatedUser;
  }

  async handlePayment(event: Stripe.Event) {
      let { invoice, user } =
        await this.getInvoiceAndUserFromStripeEvent(event);
      if (invoice.subscription) {
        this.handleSubscriptionPayment(
          event.type === 'invoice.payment_failed' ? 'failed' : 'succeeded',
          invoice,
          user,
        );
      } else {
        this.handleNormalPayment(
          event.type === 'invoice.payment_failed' ? 'failed' : 'succeeded',
          invoice,
          user,
        );
      }
  }

  private async handleSubscriptionPayment(
    status: 'failed' | 'succeeded',
    invoice: Stripe.Invoice,
    user: User,
  ) {
    //get the subscription details from the invoice
    const subscriptionId = invoice.subscription as string;

    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);


    if (
      !subscription.items ||
      !subscription.items.data ||
      subscription.items.data.length === 0
    ) {
      throw new BadRequestException(
        'Subscription items data is missing or empty',
      );
    }

    const plan = subscription.items.data[0]?.plan;
    if (!plan) {
      throw new BadRequestException('Plan data is missing');
    }

    let planName = null;
    if (status === 'succeeded') {
      const product = await this.stripe.products.retrieve(
        plan.product as string,
      );
      planName = product.name;
    }

    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    const subscriptionEndDateISO = subscriptionEndDate.toISOString();
    user.subscriptionEndDate = subscriptionEndDateISO;


    //update the status of the user and the plan subscribed for
    user.subscriptionStatus = subscription.status;
    user.subscribedPlan = planName !== null ? planName : 'free';
    user.subscriptionId = subscriptionId;

    let failureReason = null;
    if (status == 'failed') {
      failureReason =
        invoice.payment_intent && typeof invoice.payment_intent !== 'string'
          ? invoice.payment_intent?.last_payment_error?.message ||
            'Payment failed'
          : 'Payment failed';
    }

    let paymentMethod = 'unknown';
    if (invoice.payment_intent) {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        invoice.payment_intent as string,
      );
      if (paymentIntent.payment_method) {
        const paymentMethodObj = await this.stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string,
        );
        paymentMethod = paymentMethodObj.type;
      }
    }

    const transactionObj = {
      plan: planName,
      type: 'subscription',
      userId: user.id,
      amount: plan.amount / 100,
      currency: plan.currency,
      transactionId: subscription.latest_invoice,
      paymentMethod,
      status,
      subscriptionId: subscription.id,
      failureReason,
    };

    const transaction = plainToInstance(CreateTransactionDto, transactionObj);

    await this.entityManager.transaction(async (manager) => {
      await manager.update(User, user.id, user);
      await manager.save(Transaction, transaction);
    });

    const notification: Payment = {
      user,
      transactionObj,
    };

    if (status === 'succeeded') {
      this.eventEmitter.emit(
        events.PAYMENT_SUCCESS,
        new PaymentEvent(notification),
      );

      this.eventEmitter.emit(
        events.SUBSCRIPTION_PAYMENT_SUCCESS,
        new PaymentEvent(notification),
      );
    } else {
      this.eventEmitter.emit(
        events.PAYMENT_FAILED,
        new PaymentEvent(notification),
      );

      this.eventEmitter.emit(
        events.SUBSCRIPTION_PAYMENT_FAILED,
        new PaymentEvent(notification),
      );
    }
  }

  private async handleNormalPayment(
    status: 'failed' | 'succeeded',
    invoice: Stripe.Invoice,
    user: User,
  ) {
    let failureReason = null;

    if (status == 'failed') {
      failureReason =
        invoice.payment_intent && typeof invoice.payment_intent !== 'string'
          ? invoice.payment_intent?.last_payment_error?.message ||
            'Payment failed'
          : 'Payment failed';
    }
    const transactionObj = {
      type: 'Ticket Purchase',
      userId: user.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      transactionId: invoice.id,
      paymentMethod: invoice.payment_intent,
      status,
      failureReason,
    };

    await this.entityManager.transaction(async (manager) => {
      const transaction = plainToInstance(CreateTransactionDto, transactionObj);
      await manager.save(Transaction, transaction);
    });

    const notification: Payment = {
      user,
      transactionObj,
    };

    if (status === 'succeeded') {
      this.eventEmitter.emit(
        events.PAYMENT_SUCCESS,
        new PaymentEvent(notification),
      );
    } else {
      this.eventEmitter.emit(
        events.PAYMENT_FAILED,
        new PaymentEvent(notification),
      );
    }
  }

  async handleAccountUpdated(event: Stripe.Event) {
      const account = event.data.object as Stripe.Account;
      const user = await this.checkUserExists(account.email);

      const paymentNotification: Payment = {
        user,
      };
      if (account.charges_enabled) {
        //TODO notify user of charges enabled and encourage them to enable payouts
        this.eventEmitter.emit(
          events.CHARGES_ENABLED,
          new PaymentEvent(paymentNotification),
        );
      }
      if (account.payouts_enabled) {
        //TODO notify user of payouts enabled
        this.eventEmitter.emit(
          events.PAYOUT_ENABLED,
          new PaymentEvent(paymentNotification),
        );
      }

      if (account.charges_enabled && account.payouts_enabled) {
        user.isOnboarded = true;
        this.eventEmitter.emit(
          events.STRIPE_PAYMENT_ONBOARDING_COMPLETED,
          new PaymentEvent(paymentNotification),
        );
      }
      await this.userService.findOneByIdAndUpdate(user.id, user);
  }

  async handleCustomerCreated(event: Stripe.Event) {
      const customer = event.data.object as Stripe.Customer;
      if (!customer.email) {
        console.error('Customer email is null or undefined');
        return;
      }
      const user = await this.checkUserExists(customer.email);

      const notification: Payment = {
        user,
      };

      this.eventEmitter.emit(
        events.CUSTOMER_CREATED,
        new PaymentEvent(notification),
      );
  }

  async handlePayout(event: Stripe.Event, eventType: string) {
      const connectedAccountId = event.account;
      const user =
        await this.userService.findOneByConnectedAccountId(connectedAccountId);

      if (!user)
        throw new NotFoundException(
          `User with Stripe Connect account: ${connectedAccountId} not found`,
        );

      const payout = event.data.object as Stripe.Payout;
      const payoutNotification: Payment = {
        user,
        payout,
      };

      this.eventEmitter.emit(eventType, new PaymentEvent(payoutNotification));
  }
}
