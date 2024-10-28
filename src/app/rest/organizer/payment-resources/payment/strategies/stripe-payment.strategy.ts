import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStrategy } from './interfaces/payment-strategy.interface';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  private stripe: Stripe;
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });
  }

  async createSessions(email: string, stripeConnectedAccountId?: string) {
    let accountId;
    if (!stripeConnectedAccountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: email,
      });
      accountId = account.id; // Use the newly created account's ID
    } else {
      accountId = stripeConnectedAccountId; // Use the provided connected account ID
    }

    const accountSession = await this.stripe.accountSessions.create({
      account: accountId,
      components: {
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        balances: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
          },
        },
        documents: {
          enabled: true,
        },
        notification_banner: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        payments: {
          enabled: true,
          features: {
            refund_management: true,
            dispute_management: true,
            capture_payments: true,
            destination_on_behalf_of_charge_management: false,
          },
        },
        payment_details: {
          enabled: true,
          features: {
            refund_management: true,
            dispute_management: true,
            capture_payments: true,
            destination_on_behalf_of_charge_management: false,
          },
        },
        payouts: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
            external_account_collection: true,
          },
        },
        payouts_list: {
          enabled: true,
        },
        tax_registrations: {
          enabled: true,
        },
        tax_settings: {
          enabled: true,
        },
      },
    });

    return {
      accountId: accountId,
      clientSecret: accountSession.client_secret,
    };
    // const accountLink = await this.stripe.accountLinks.create({
    //   account: account ? account.id : stripeConnectedAccountId,
    //   refresh_url: process.env.STRIPE_REDIRECT_URI,
    //   return_url: process.env.STRIPE_REDIRECT_URI,
    //   type: 'account_onboarding',
    // });

    // return { accountId: account.id, accountLinkURL: accountLink.url };
  }
  async createCustomer(email: string, name?: string): Promise<any> {
    const customer = await this.stripe.customers.create({
      email: email,
      name: name,
    });

    return customer;
  }
  async createSubscription(customerId: string, plan: string) {
    let priceId: string;

    switch (plan.toLowerCase()) {
      case 'pro':
        priceId = process.env.STRIPE_PRO_PRICE_ID;
        break;
      case 'premium':
        priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
        break;
      default:
        throw new BadRequestException('Invalid plan');
    }
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      billing_address_collection: 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${process.env.STRIPE_SUBSCRIPTION_SUCCESS_URI}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.STRIPE_SUBSCRIPTION_CANCEL_URI,
    });

    return session;
  }

  async updateSubscription(subscriptionId: string, planName: string) {
    try {
      // Retrieve the subscription using the subscriptionId
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      if (!subscription) {
        throw new BadRequestException(
          'No subscription found for the subscriptionId',
        );
      }

      const products = await this.stripe.products.list({
        active: true,
      });

      // Find the product that matches the given planName
      const product = products.data.find(
        (product) => product.name.toLowerCase() === planName,
      );

      if (!product) {
        throw new BadRequestException(
          `No product found for the plan name: ${planName}`,
        );
      }

      // Retrieve the prices associated with the found product
      const prices = await this.stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length === 0) {
        throw new BadRequestException(
          `No prices found for the product: ${product.name}`,
        );
      }

      const priceId = prices.data[0].id;

      // Update the subscription with the new plan
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: 'create_prorations', // Prorate changes
        },
      );

      return updatedSubscription;
    } catch (error) {
      throw new BadRequestException(
        `Failed to update subscription: ${error.message}`,
      );
    }
  }

  handleWebHook(eventData: any): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
