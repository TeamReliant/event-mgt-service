import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
import { StripePaymentStrategy } from '../stripe-payment.strategy';
import { AnyCnameRecord } from 'dns';

@Injectable()
export class PaymentStrategyResolver {
  private strategies = new Map<string, any>();

  constructor(private readonly stripePaymentStrategy: StripePaymentStrategy) {
    this.strategies.set('stripe', this.stripePaymentStrategy);
    //add more strategies if needed
  }

  getStrategy(paymentMethod: string) {
    const strategy = this.strategies.get(paymentMethod);
    if (!strategy) {
      throw new BadRequestException('Unsupported payment method');
    }
    return strategy;
  }
}
