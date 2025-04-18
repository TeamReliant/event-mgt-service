import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  UseGuards,
  HttpStatus,
  Req,
  Res,
  RawBodyRequest,
  Get,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { events } from '@config/app.config';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { UserType } from '@app/rest/users/enums/user-type';
import { GetFeesDto } from '@app/rest/organizer/payment-resources/payment/dto/get-fees.dto';
import { RefundBookingDto } from '@app/rest/organizer/payment-resources/payment/dto/refund-booking.dto';

@Controller('payment')
export class PaymentController {
  private stripe: Stripe;
  constructor(private readonly paymentService: PaymentService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  @Post('create-sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createSessions(
    @CurrentUser() user: TJwtPayload,
    @Query('paymentMethod') paymentMethod: string,
  ) {
    const clientSecret = await this.paymentService.createSessions(
      user,
      paymentMethod,
    );
    return ResponseSerializer.data({ clientSecret });
  }

  @Post('create-subscription')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createSubscription(
    @Body() createSubDto: CreateSubscriptionDto,
    @CurrentUser() user: TJwtPayload,
    @Req() req: Request,
  ) {
    const { statusCode, data } = await this.paymentService.createSubscription(
      user,
      createSubDto,
      req,
    );
    return ResponseSerializer.data({ statusCode, data });
  }

  @Post('cancel-subscription')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @CurrentUser() user: TJwtPayload,
    @Query('paymentMethod') paymentMethod: string,
  ) {
    await this.paymentService.cancelSubscription(user, paymentMethod);
    return ResponseSerializer.message('Subscription cancelled successfully');
  }

  @Post('stripe-webhooks')
  async handleWebhooks(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    let event = req.body;
    const signature = req.headers['stripe-signature'];

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      console.error('Error handling webhook signature:', error.message);
      return res.status(HttpStatus.BAD_REQUEST).send();
    }

    switch (event.type) {
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await this.paymentService.handlePayment(event);
        break;
      // case 'account.updated':
      //   await this.paymentService.handleAccountUpdated(event);
      //   break;
      case 'payout.paid':
      case 'payout.failed':
        await this.paymentService.handlePayout(
          event,
          event.type === 'payout.paid'
            ? events.PAYOUT_SUCCESS
            : events.PAYOUT_FAILED,
        );
        break;
      case 'customer.created':
        await this.paymentService.handleCustomerCreated(event);
        break;
      case 'customer.subscription.deleted':
        await this.paymentService.handleSubscriptionDeleted(event);
        break;
      case 'checkout.session.completed':
        await this.paymentService.handleBookingsCheckoutSessionCompleted(event);
        break;
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(HttpStatus.OK).send();
  }

  @Get('express-dashboard')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ORGANIZER]))
  async getExpressDashboard(@CurrentUser() user: TJwtPayload) {
    const url = await this.paymentService.getExpressDashboard(user.userId);
    return ResponseSerializer.data(url);
  }

  @Post('fees')
  @HttpCode(HttpStatus.OK)
  async getSystemFees(@Body() { amount }: GetFeesDto) {
    const data = await this.paymentService.getFees(amount);
    return ResponseSerializer.data(data);
  }

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ORGANIZER]))
  async refundPayment(
    @Body() { bookingId }: RefundBookingDto,
    @CurrentUser() user: TJwtPayload,
  ) {
    await this.paymentService.refundPayment(bookingId, user.userId);
    return ResponseSerializer.message('Payment refunded successfully');
  }
}
