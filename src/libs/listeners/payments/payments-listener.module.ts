import { PaymentEvent } from '@app/rest/payment-resources/payment/events/payment.event';
import { events } from '@config/app.config';
import { PaymentsEmailService } from '@libs/notifications/email/payments/payments-email.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class PaymentListener {
  constructor(
    private readonly paymentsEmailService: PaymentsEmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}


  @OnEvent(events.CHARGES_ENABLED)
  async dispatchChargesEnabledNotification(payload: PaymentEvent) {
    const { paymentNotification } = payload;
    await this.paymentsEmailService.sendChargesEnabledMessage(
      paymentNotification,
    );

    // Remove the event from the queue  when done
    this.eventEmitter.removeListener(
      events.CHARGES_ENABLED,
      this.dispatchChargesEnabledNotification,
    );
  }

  @OnEvent(events.PAYOUT_ENABLED)
  async dispatchPayoutsEnabledNotification(payload: PaymentEvent) {
    const { paymentNotification } = payload;
    await this.paymentsEmailService.sendPayoutsEnabledMessage(
      paymentNotification,
    );

    // Remove the event from the queue when done
    this.eventEmitter.removeListener(
      events.PAYOUT_ENABLED,
      this.dispatchPayoutsEnabledNotification,
    );
  }

  @OnEvent(events.STRIPE_PAYMENT_ONBOARDING_COMPLETED)
  async dispatchStripeOnboardingCompletedNotification(payload: PaymentEvent) {
    const { paymentNotification } = payload;
    await this.paymentsEmailService.sendStripePaymentOnboardingCompletedMessage(
      paymentNotification,
    );

    // Remove the event from the queue when done
    this.eventEmitter.removeListener(
      events.STRIPE_PAYMENT_ONBOARDING_COMPLETED,
      this.dispatchStripeOnboardingCompletedNotification,
    );
  }

  @OnEvent(events.PAYOUT_SUCCESS)
  async dispatchPayoutSuccessMessage(payload: PaymentEvent)
  {
    const {paymentNotification} = payload;
    await this.paymentsEmailService.sendPayoutSuccessMessage(paymentNotification);

    this.eventEmitter.removeListener(
      events.PAYOUT_SUCCESS,
      this.dispatchPayoutSuccessMessage
    );
  }

  @OnEvent(events.PAYOUT_FAILED)
  async dispatchPayoutFailedMessage(payload: PaymentEvent)
  {
    const {paymentNotification} = payload;
    await this.paymentsEmailService.sendPayoutFailedMessage(paymentNotification);

    this.eventEmitter.removeListener(
      events.PAYOUT_SUCCESS,
      this.dispatchPayoutFailedMessage
    );
  }
}
