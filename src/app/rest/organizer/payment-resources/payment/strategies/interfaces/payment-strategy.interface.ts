export interface PaymentStrategy {
  createCustomer(email: string, name?: string): Promise<any>;
  createSubscription(customerId: string, planId: string): Promise<any>;
  updateSubscription(
    sessionId: string,
    email?: string,
    planId?: string,
  ): Promise<any>;
  handleWebHook(eventData: any): Promise<any>;
}
