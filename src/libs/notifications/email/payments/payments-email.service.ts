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

  private async sendEmail(
    paymentNotification: Payment,
    subject: string,
    template: string,
    additionalPayload: any = {},
  ) {
    const { user } = paymentNotification;
    const payload = {
      appInfo,
      user,
      ...additionalPayload,
    };

    await this.emailEngineService.sendHtmlEmail(
      [user.email],
      subject,
      template,
      payload,
    );
  }

  async sendSubscriptionCanceledMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Subscription Canceled!`;
    const template = `payments/subscription-canceled`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      formLink: `${this.configService.get<string>('FORM_URL')}`,
    };
    await this.sendEmail(paymentNotification, subject, template, additionalPayload);
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

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendCustomerCreatedMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Customer Created!`;
    const template = `payments/customer-created`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
    };

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendStripePaymentOnboardingCompletedMessage(
    paymentNotification: Payment,
  ) {
    const subject: string = `${appInfo.appName}: Stripe Payment Onboarding is Complete!`;
    const template = `payments/connect-onboarding-complete`;
    await this.sendEmail(paymentNotification, subject, template);
  }

  async sendPayoutSuccessMessage(payoutNotification: Payment) {
    const subject: string = `${appInfo.appName}: Payout Success!`;
    const template = `payments/payout-success`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      payoutAmount: (payoutNotification.payout.amount / 100).toFixed(2),
    };
    await this.sendEmail(
      payoutNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendPayoutFailedMessage(payoutNotification: Payment) {
    const subject: string = `${appInfo.appName}: Payout Failed!`;
    const template = `payments/payout-success`;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      payoutAmount: (payoutNotification.payout.amount / 100).toFixed(2),
    };
    await this.sendEmail(
      payoutNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendPaymentFailedMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Payment Failed!`;
    const template = `payments/payment-failed`;
    const { transactionObj } = paymentNotification;
    await this.sendEmail(paymentNotification, subject, template);
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      ...transactionObj,
    };

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendPaymentSuccessMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Payment Succeeded!`;
    const template = `payments/payment-succeeded`;
    const { transactionObj } = paymentNotification;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      ...transactionObj,
    };

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendSubscriptionPaymentSuccessMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Subscription Payment Success!`;
    const template = `payments/subscription-payment-success`;
    const { transactionObj } = paymentNotification;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      ...transactionObj,
    };

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }

  async sendSubscriptionPaymentFailedMessage(paymentNotification: Payment) {
    const subject: string = `${appInfo.appName}: Subscription Payment Success!`;
    const template = `payments/subscription-payment-success`;
    const { transactionObj } = paymentNotification;
    const additionalPayload = {
      dashboardLink: `${this.configService.get<string>('FRONTEND_URL')}/dashboard`,
      ...transactionObj,
    };

    await this.sendEmail(
      paymentNotification,
      subject,
      template,
      additionalPayload,
    );
  }
}
