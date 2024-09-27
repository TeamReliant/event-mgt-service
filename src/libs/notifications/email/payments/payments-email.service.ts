import { Injectable } from '@nestjs/common';
import { EmailEngineService } from '../email-engine/email-engine.service';
import { appInfo } from '@config/app.config';
import { Payment } from '@app/rest/payment-resources/payment/entities/payment.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsEmailService {
  constructor(
    private readonly emailEngineService: EmailEngineService,
    private readonly configService: ConfigService,
  ) {}


  private async sendEmail(paymentNotification: Payment, subject: string, template: string, additionalPayload: any = {})
  {
    const { user } = paymentNotification;
    const payload = {
      appInfo,
      user,
      ...additionalPayload
    };

    await this.emailEngineService.sendHtmlEmail(
      [user.email],
      subject,
      template,
      payload,
    );
  }

  async sendPaymentConfirmationMessage() {
    // Send payment confirmation message
  }

  async sendChargesEnabledMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Congratulations on Enabling Charges!`;
    const template = `payments/charges-enabled`;
    await this.sendEmail(paymentNotification, subject, template);
  }

  async sendPayoutsEnabledMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Your Payouts are Now Enabled!`;
    const template = `payments/payouts-enabled`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
    };

    await this.sendEmail(paymentNotification, subject, template, additionalPayload);
  }

  async sendStripePaymentOnboardingCompletedMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Stripe Payment Onboarding is Complete!`;
    const template = `payments/stripe-onboarding-completed`;
    await this.sendEmail(paymentNotification, subject, template);
  }

  async sendPayoutSuccessMessage(payoutNotification: Payment)
  {
    const subject: string = `${appInfo.appName}: Payout Success!`;
    const template = `payments/payout-success`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      payoutAmount: ((payoutNotification.payout.amount) / 100).toFixed(2)
    }
    await this.sendEmail(payoutNotification, subject, template, additionalPayload);
  }

  async sendPayoutFailedMessage(payoutNotification: Payment)
  {
    const subject: string = `${appInfo.appName}: Payout Failed!`;
    const template = `payments/payout-success`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      payoutAmount: ((payoutNotification.payout.amount) / 100).toFixed(2)
    }
    await this.sendEmail(payoutNotification, subject, template, additionalPayload);
  }
}
