import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, getManager } from 'typeorm';
import { UsersService } from '@app/rest/users/users.service';
import { TJwtPayload } from '@libs/types';
import { PaymentStrategyResolver } from './strategies/shared/payment-strategy.resolver';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import Stripe from 'stripe';
import { plainToInstance } from 'class-transformer';
import { CreateTransactionDto } from '@app/rest/organizer/transaction-resources/transactions/dto/create-transaction.dto';
import { User } from '@app/rest/users/entities/user.entity';
import { Transaction } from '@app/rest/organizer/transaction-resources/transactions/entities/transaction.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@config/app.config';
import { Payment } from './entities/payment.entity';
import { PaymentEvent } from './events/payment.event';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { ConfigService } from '@nestjs/config';
import { Booking } from '@app/rest/attendee/bookings/entities/booking.entity';
import { BookingsTransaction } from '@app/rest/attendee/bookings-transactions/entities/bookings-transaction.entity';
import { Ticket } from '@app/rest/organizer/ticket-resources/tickets/entities/ticket.entity';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';
import { TicketCategory } from '@app/rest/organizer/ticket-resources/tickets/enums';
import {
  BookingStatus,
  TicketTransferStatus,
} from '@app/rest/attendee/bookings/enums/booking-status';
import { BookingsEvent } from '@app/rest/attendee/bookings/events/bookings.event';
import { Request } from 'express';
import { FreeTicketReaction } from '@app/rest/attendee/bookings/enums/free-ticket-reaction';
import { SystemRegister } from '@app/rest/admin/system-register/entities/system-register.entity';
import { BookingEvent } from '@app/rest/attendee/bookings/events/booking.event';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  constructor(
    private readonly userService: UsersService,
    private readonly paymentStrategyResolver: PaymentStrategyResolver,
    private readonly entityManager: EntityManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  private async validateUserType(user: TJwtPayload, userType: string) {
    const currUser = await this.userService.findOne(user.userId);
    if (currUser.userType !== userType) {
      throw new BadRequestException(
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

  public async createStripeConnectedAccountId(user: User) {
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
      const { accountId, clientSecret } = await paymentStrategy.createSessions(
        currUser.email,
      );

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
    req: Request,
  ) {
    const { paymentMethod, cancelUrl } = req.query;
    const paymentStrategy = this.paymentStrategyResolver.getStrategy(
      paymentMethod as string,
    );
    const currUser = await this.validateUserType(user, 'organizer');
    if (!currUser.customerId) {
      await this.createCustomer(user, paymentMethod as string);
    }

    if (!currUser.stripeConnectedAccountId) {
      await this.createStripeConnectedAccountId(currUser);
    }

    if (
      currUser.subscriptionStatus === 'active' ||
      currUser.subscriptionStatus === 'trialing'
    ) {
      const updatedUser = await this.updateSubscription(
        currUser,
        paymentMethod as string,
        createSubDto,
      );
      return { statusCode: 200, data: updatedUser };
    } else {
      const session = await paymentStrategy.createSubscription(
        currUser.customerId,
        createSubDto.plan,
        cancelUrl as string,
      );
      return { statusCode: 303, data: session.url };
    }
  }

  async cancelSubscription(user: TJwtPayload, paymentMethod: string) {
    const paymentStrategy =
      this.paymentStrategyResolver.getStrategy(paymentMethod);
    const currUser = await this.validateUserType(user, 'organizer');

    if (!currUser.subscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    await this.stripe.subscriptions.update(currUser.subscriptionId, {
      cancel_at_period_end: true,
    });

    this.eventEmitter.emit(
      events.SUBSCRIPTION_CANCELED,
      new PaymentEvent({ user: currUser }),
    );
    return;
  }
  async updateSubscription(
    currUser: User,
    paymentMethod: string,
    createSubDto: CreateSubscriptionDto,
  ) {
    if (
      currUser.subscribedPlan.toLowerCase() === createSubDto.plan.toLowerCase()
    ) {
      throw new BadRequestException('User is already subscribed to this plan');
    }
    const paymentStrategy =
      await this.paymentStrategyResolver.getStrategy(paymentMethod);

    const updatedSubscription = await paymentStrategy.updateSubscription(
      currUser.subscriptionId,
      createSubDto.plan,
    );
    if (!updatedSubscription)
      throw new InternalServerErrorException(
        'An Error occured while updating subscription',
      );

    const subscriptionEndDate = new Date(
      updatedSubscription.current_period_end * 1000,
    );
    const subscriptionEndDateISO = subscriptionEndDate.toISOString();
    currUser.subscriptionEndDate = subscriptionEndDateISO;
    currUser.subscribedPlan = createSubDto.plan;

    const updatedUser = await this.userService.findOneByIdAndUpdate(
      currUser.id,
      currUser,
    );
    if (!updatedUser)
      throw new InternalServerErrorException(
        'User could not be updated with latest subscription data',
      );
    return updatedUser;
  }

  async handlePayment(event: Stripe.Event) {
    const { invoice, user } =
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

    const subscriptionEndDate = new Date(
      subscription.current_period_end * 1000,
    );
    const subscriptionEndDateISO = subscriptionEndDate.toISOString();
    user.subscriptionEndDate = subscriptionEndDateISO;

    //update the status of the user and the plan subscribed for
    user.subscriptionStatus = subscription.status;
    user.subscribedPlan = planName !== null ? planName.toLowerCase() : 'free';
    user.subscriptionId = subscriptionId;

    let failureReason = null;
    if (status == 'failed') {
      failureReason =
        invoice.payment_intent && typeof invoice.payment_intent !== 'string'
          ? invoice.payment_intent?.last_payment_error?.message ||
            'Payment failed'
          : 'Payment failed';
    }

    let paymentMethod = 'card';
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
      //reset the broadcastMessage field to 0 the current billing cycle for all events created be the user
      await manager
        .createQueryBuilder()
        .update(Event)
        .set({ numberOfBroadcastMessageSent: 0 })
        .where('userId = :userId', { userId: user.id })
        .execute();
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

  async getUserAccountDetails(acccountId: string) {
    return await this.stripe.accounts.retrieve(acccountId);
  }
  async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const user = await this.userService.findOneBySubscriptionId(
      subscription.id,
    );

    if (!user) {
      throw new NotFoundException(
        `User with subcriptionId: ${subscription.id} not found`,
      );
    }

    user.subscriptionStatus = 'canceled';
    user.subscriptionEndDate = new Date().toISOString();
    user.subscribedPlan = 'free';
    user.subscriptionId = null;

    await this.userService.findOneByIdAndUpdate(user.id, user);

    //TODO notify user of subscription cancellation
  }

  /**
   * Calculates total revenue from subscription
   * @returns total revenue from subscription
   */
  public async getSubscriptionRevenue() {
    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const paginationParams = startingAfter
        ? { starting_after: startingAfter }
        : {};
      const balanceTransactions = await this.stripe.balanceTransactions.list({
        limit: 100,
        type: 'charge',
        expand: ['data.source'],
        ...paginationParams,
      });

      for (const transaction of balanceTransactions.data) {
        const source = transaction.source as Stripe.Charge;
        if (
          transaction.status === 'available' &&
          source &&
          source.invoice &&
          !source.transfer &&
          transaction.reporting_category === 'charge'
        ) {
          totalRevenue += transaction.net;
        }
      }

      hasMore = balanceTransactions.has_more;
      if (hasMore && balanceTransactions.data.length > 0) {
        startingAfter =
          balanceTransactions.data[balanceTransactions.data.length - 1].id;
      }
    }
    return totalRevenue / 100;
  }
  // async handleAccountUpdated(event: Stripe.Event) {
  //   //logs for debug purposes
  //   console.log('Stripe Event:', {
  //     id: event.id,
  //     type: event.type,
  //     created: new Date(event.created * 1000).toISOString(),
  //     data: JSON.stringify(event.data.object, null, 2),
  //   });

  //   const account = event.data.object as Stripe.Account;

  //   console.log('Account Status:', {
  //     id: account.id,
  //     email: account.email,
  //     charges_enabled: account.charges_enabled,
  //     payouts_enabled: account.payouts_enabled,
  //     details_submitted: account.details_submitted,
  //   });

  //   const user = await this.checkUserExists(account.email);

  //   if (!user.stripeConnectedAccountId)
  //     user.stripeConnectedAccountId = account.id;

  //   // Check onboarding status
  //   const wasOnboarded = user.isOnboarded;
  //   if (account.charges_enabled && account.payouts_enabled)
  //     user.isOnboarded = true;

  //   await this.userService.findOneByIdAndUpdate(user.id, user);

  //   const paymentNotification: Payment = {
  //     user,
  //   };

  //   if (account.charges_enabled && account.payouts_enabled) {
  //     user.isOnboarded = true;
  //   }
  //   await this.userService.findOneByIdAndUpdate(user.id, user);

  //   if (account.charges_enabled) {
  //     this.eventEmitter.emit(
  //       events.CHARGES_ENABLED,
  //       new PaymentEvent(paymentNotification),
  //     );
  //   }
  //   if (account.payouts_enabled) {
  //     //TODO notify user of payouts enabled
  //     this.eventEmitter.emit(
  //       events.PAYOUT_ENABLED,
  //       new PaymentEvent(paymentNotification),
  //     );
  //   }

  //   // Only emit onboarding completed if it wasn't previously onboarded
  //   if (user.isOnboarded && !wasOnboarded) {
  //     this.eventEmitter.emit(
  //       events.STRIPE_PAYMENT_ONBOARDING_COMPLETED,
  //       new PaymentEvent(paymentNotification),
  //     );
  //   }
  // }

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

  async createPaymentIntent(
    stripeCustomerId: string,
    amount: number = 1400,
  ): Promise<any> {
    return await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });
  }

  // confirm paymentIntent from stripe
  async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      throw new NotAcceptableException(error);
    }
  }

  // retrieve paymentIntent from stripe
  async retrievePaymentIntent(paymentIntentId: string): Promise<any> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createCheckoutSession(
    bookings: Booking[],
    cancelUrl: string = null,
  ): Promise<any> {
    const totalAmount = bookings.reduce((currentAmount, booking) => {
      return currentAmount + booking.ticket.price * booking.quantity;
    }, 0);

    const { stripeFee, platformFee, total } = await this.getFees(totalAmount);
    const booking = bookings[0];

    // find the organizer that owns the event
    const event = await this.entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.user', 'user')
      .where('event.id = :eventId', { eventId: booking.event.id })
      .getOne();

    if (!event.user?.stripeConnectedAccountId)
      throw new BadRequestException(
        `Organizer cannot accept ticket payment at the moment, try again after some time!`,
      );

    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay'],
      line_items: [
        {
          price_data: {
            currency: this.configService.get<string>(
              'STRIPE_CHECKOUT_SESSION_CURRENCY',
            ),
            product_data: {
              name: `EVENT BOOKING - ${booking.event.name.toUpperCase()}`,
              description: `By ${booking.firstName} ${booking.lastName}, Email: ${booking.email}`,
            },
            unit_amount: Math.round(total * 100), // Amount in cents, adjust based on ticket price
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: booking.email,
      payment_intent_data: {
        application_fee_amount: Math.round((platformFee + stripeFee) * 100), // Fee to our platform
        transfer_data: {
          destination: event.user.stripeConnectedAccountId, // Organizer's connected account
        },
      },
      currency: this.configService.get<string>(
        'STRIPE_CHECKOUT_SESSION_CURRENCY',
      ),
      success_url: this.configService.get<string>(
        'STRIPE_CHECKOUT_SESSION_SUCCESS_URL',
      ),
      cancel_url:
        cancelUrl ??
        this.configService.get<string>('STRIPE_CHECKOUT_SESSION_CANCEL_URL'),
    });
  }

  async handleBookingsCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    return this.verifyBookingsCheckoutSession(session.id);
  }

  async verifyBookingsCheckoutSession(sessionId: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // new bookings generated from the current one
    let newBookings: Booking[];

    // find the booking transaction with the checkout id that is not processed yet
    const transaction = await this.entityManager
      .createQueryBuilder(BookingsTransaction, 'transaction')
      .leftJoinAndSelect('transaction.bookings', 'bookings')
      .leftJoinAndSelect('bookings.event', 'event')
      .leftJoinAndSelect('event.user', 'host')
      .leftJoinAndSelect('bookings.user', 'user')
      .leftJoinAndSelect('bookings.ticket', 'ticket')
      .where('transaction.stripeCheckoutId = :stripeCheckoutId', {
        stripeCheckoutId: session.id,
      })
      .andWhere('transaction.processed = :processed', { processed: false })
      .getOne();

    if (!transaction) throw new NotFoundException('Transaction not found');

    // Create database transaction for the database changes
    await this.entityManager.transaction(async (manager) => {
      if (session.payment_status === 'paid') {
        transaction.processed = true;
        transaction.paid = true;
        transaction.currency = session.currency;

        // Keep track of total revenue and event
        let totalRevenue: number = 0.0;
        let totalTicketsSold: number = 0;
        let totalFreeTickets: number = 0;
        let totalTicketsProcessed: number = 0;
        const bookings: Booking[] = [];
        let event: Event = undefined;

        // loop through the bookings and update
        for (const booking of transaction.bookings) {
          // spread the booking based on the quantity
          for (let i = 1; i <= booking.quantity; i++) {
            const status =
              booking.reaction === FreeTicketReaction.NOT_GOING
                ? BookingStatus.INVALID
                : BookingStatus.VALID;

            const newBooking = manager.create(Booking, {
              quantity: 1,
              category: booking.category,
              reaction: booking.reaction,
              unitAmount: booking.unitAmount,
              email: booking.email,
              firstName: booking.firstName,
              lastName: booking.lastName,
              user: booking.user,
              event: booking.event,
              ticket: booking.ticket,
              bookingId: await this.generateBookingId(),
              processed: true,
              status:
                booking.category === TicketCategory.FREE
                  ? status
                  : BookingStatus.VALID,
            });

            if (booking.category === TicketCategory.PAID) {
              newBooking.paid = true;
              newBooking.transaction = transaction;
            }

            if (
              booking.ticket.availableTickets &&
              booking.ticket.numberOfTicketsSold ===
                booking.ticket.availableTickets
            ) {
              booking.ticket.isAvailable = false;
            }

            // increase the number of tickets sold for the ticket
            booking.ticket.numberOfTicketsSold += 1;
            await manager.save(Ticket, booking.ticket);
            // push the booking to list to be saved
            bookings.push(newBooking);
          }

          if (booking.category === TicketCategory.PAID) {
            // update the event's revenue
            const price = +booking.unitAmount * booking.quantity;

            if (!event) event = booking.event;
            totalRevenue += price;
            totalTicketsSold = totalTicketsSold + booking.quantity;
          }

          if (booking.category === TicketCategory.FREE)
            totalFreeTickets += booking.quantity;

          // update the total tickets processed variable
          totalTicketsProcessed = totalTicketsProcessed + booking.quantity;

          // save the newly generated bookings
          newBookings = await manager.save(Booking, bookings);

          // remove the initial booking
          await manager.remove(Booking, booking);
        }

        if (event) {
          // update the event's revenue
          event.revenue = +event.revenue + totalRevenue;
          event.totalNumberOfTicketsRsvp =
            +event.totalNumberOfTicketsRsvp + totalFreeTickets;
          event.totalNumberOfTicketsSold =
            +event.totalNumberOfTicketsSold + totalTicketsSold;
          event.totalStripeFee = +event.totalStripeFee + transaction.stripeFee;
          event.totalPlatformFee = +event.totalPlatformFee + transaction.fee;

          // update the user's revenue and tickets sold
          event.user.totalRevenue = +event.user.totalRevenue + totalRevenue;
          event.user.ticketsSold = +event.user.ticketsSold + totalTicketsSold;
          event.user.ticketsRsvp = +event.user.ticketsRsvp + totalFreeTickets;
          event.user.totalStripeFee =
            +event.user.totalStripeFee + transaction.stripeFee;
          event.user.totalPlatformFee =
            +event.user.totalPlatformFee + transaction.fee;

          await manager.save(User, event.user);
          // update the event
          await manager.save(Event, event);
        }

        // fetch the system register
        const systemRegister = await manager
          .createQueryBuilder(SystemRegister, 'system')
          .getOne();

        // update the system register
        systemRegister.totalRevenue += transaction.fee;
        systemRegister.ticketsSold += totalTicketsSold;
        systemRegister.totalTicketsProcessed += totalTicketsProcessed;
        systemRegister.ticketsRsvp += totalFreeTickets;
        await manager.save<SystemRegister>(systemRegister);

        // delete old transactions from memory
        delete transaction.bookings;
        // Save the transaction details
        return await manager.save(BookingsTransaction, transaction);
      }

      throw new NotAcceptableException('Payment not completed');
    });

    if (newBookings && newBookings.length)
      this.eventEmitter.emit(
        events.BOOKING_COMPLETED,
        new BookingsEvent(newBookings),
      );
  }

  async getExpressDashboard(userId: string) {
    // find the user with the userId
    const user = await this.userService.findOne(userId);
    if (!user.stripeConnectedAccountId)
      throw new NotAcceptableException(
        'Please complete your payout onboarding',
      );

    const expressUrl = await this.stripe.accounts.createLoginLink(
      user.stripeConnectedAccountId,
    );
    return expressUrl.url;
  }

  async generateBookingId(): Promise<string> {
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const bookingId = `#${randNum}`;
    // check if the booking number already exists
    const booking = await this.entityManager.findOneBy(Booking, { bookingId });
    if (booking) return this.generateBookingId();

    return bookingId;
  }

  async retrieveCheckoutSession(sessionId: string): Promise<any> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }

  async getFees(amount: number) {
    const stripeFee = +this.configService.get<number>('STRIPE_FEE');

    const percentageCut = +this.configService.get<number>(
      'TICKET_PERCENTAGE_CUT',
    );

    // calculate the percentage cut of the totalAmount
    const percentageCutAmount = (amount * percentageCut) / 100 + 0.5;
    const stripeFeeAmount = (amount * stripeFee) / 100 + 0.3;

    return {
      platformFee: percentageCutAmount,
      stripeFee: stripeFeeAmount,
      total: percentageCutAmount + stripeFeeAmount + amount,
    };
  }

  async refundPayment(bookingId: string, userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user.stripeConnectedAccountId)
      throw new NotAcceptableException(
        'Please complete your payout onboarding',
      );

    // find the booking with the bookingId
    const booking = await this.entityManager
      .createQueryBuilder(Booking, 'booking')
      .leftJoinAndSelect('booking.transaction', 'transaction')
      .leftJoinAndSelect('booking.ticket', 'ticket')
      .leftJoinAndSelect('booking.event', 'event')
      .leftJoinAndSelect('event.user', 'user')
      .where('booking.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.category !== TicketCategory.PAID)
      throw new NotAcceptableException('Booking is not paid for');

    if (!booking.processed || !booking.paid)
      throw new NotAcceptableException('Booking is not paid for');
    // check if the booking has been transferred out
    if (
      booking.transferStatus === TicketTransferStatus.TRANSFERRED ||
      booking.transferStatus === TicketTransferStatus.RECEIVED
    )
      throw new NotAcceptableException(
        'Transferred booking is not eligible for a refund',
      );
    if (booking.status === BookingStatus.USED)
      throw new NotAcceptableException(
        'Used booking is not eligible for a refund',
      );
    if (booking.refunded)
      throw new NotAcceptableException('Booking has already been refunded');

    const session = await this.stripe.checkout.sessions.retrieve(
      booking.transaction.stripeCheckoutId,
    );

    if (!session) throw new NotFoundException('Transaction record not found');
    if (!session.payment_intent) {
      throw new NotAcceptableException('Payment Intent not found in session');
    }

    // get the booking refund data
    const { platformFee, stripeFee } = await this.getFees(booking.unitAmount);

    const paymentIntentId = session.payment_intent as string;
    // Step 1: Fetch the connected account balance
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: user.stripeConnectedAccountId,
    });

    // Step 2: Check the available balance
    const availableBalance = balance.available.reduce(
      (total, balanceItem) => total + balanceItem.amount,
      0,
    );

    if (availableBalance < Math.round(booking.unitAmount * 100)) {
      throw new NotAcceptableException(
        'Insufficient balance in connected account for the refund',
      );
    }

    await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(+booking.unitAmount * 100),
      // refund_application_fee: true,
      reverse_transfer: true,
    });

    await this.entityManager.transaction(async (manager) => {
      // update system analytics
      const systemRegister = await manager
        .createQueryBuilder(SystemRegister, 'system')
        .getOne();

      systemRegister.totalRevenue -= booking.unitAmount;
      systemRegister.ticketsSold -= 1;

      // Update booking
      booking.refunded = true;
      booking.status = BookingStatus.INVALID;

      // update the ticket
      booking.ticket.numberOfTicketsSold -= 1;

      // update the event's revenue
      booking.event.revenue -= booking.unitAmount;
      booking.event.totalNumberOfTicketsSold -= 1;
      booking.event.totalStripeFee -= stripeFee;
      booking.event.totalPlatformFee -= platformFee;

      // update the user's revenue and tickets sold
      booking.event.user.totalRevenue -= booking.unitAmount;
      booking.event.user.ticketsSold--;
      booking.event.user.totalStripeFee -= stripeFee;
      booking.event.user.totalPlatformFee -= platformFee;

      // update the transaction record
      booking.transaction.refundedAmount += booking.unitAmount;
      booking.transaction.refundedFee += platformFee;

      await manager.save<User>(booking.event.user);
      await manager.save<Event>(booking.event);
      await manager.save<Booking>(booking);
      await manager.save<SystemRegister>(systemRegister);
    });

    this.eventEmitter.emit(events.BOOKING_REFUNDED, new BookingEvent(booking));

    return true;
  }
}
