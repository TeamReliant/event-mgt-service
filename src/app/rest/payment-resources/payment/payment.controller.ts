import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  UseGuards,
  HttpStatus,
  Req,
  Res,
  RawBody,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { events } from '@config/app.config';

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
    @Query('paymentMethod') paymentMethod: string,
  ) {
    const { statusCode, sessionUrl } =
      await this.paymentService.createSubscription(
        user,
        createSubDto,
        paymentMethod,
      );
    return ResponseSerializer.data({ statusCode, sessionUrl });
  }

  @Post('update-subscription')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async updateSubscription(
    @CurrentUser() user: TJwtPayload,
    @Query('paymentMethod') paymentMethod: string,
    @Body() createSubDto: CreateSubscriptionDto,
  ) {
    const updatedSubscription = await this.paymentService.updateSubscription(
      user,
      paymentMethod,
      createSubDto,
    );
    return ResponseSerializer.data(updatedSubscription);
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
      case 'account.updated':
        await this.paymentService.handleAccountUpdated(event);
        break;
      case 'payout.paid':
      case 'payout.failed':
        await this.paymentService.handlePayout(event, events.PAYOUT_FAILED);
        break;
      case 'customer.created':
        await this.paymentService.handleCustomerCreated(event);
        break;
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(HttpStatus.OK).send();
  }
}
