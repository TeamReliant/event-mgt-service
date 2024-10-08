import { Payment } from "../entities/payment.entity";

export class PaymentEvent{
    constructor(public readonly paymentNotification: Payment){}
}