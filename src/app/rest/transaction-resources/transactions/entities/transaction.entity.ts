import { AbstractEntity } from "@libs/database";
import { Column } from "typeorm";

export class Transaction extends AbstractEntity<Transaction> {
    @Column()
    userId: string;

    @Column()
    plan: string;

    @Column()
    amount: number;

    @Column()
    currency: string;

    @Column()
    transactionId: string;

    @Column({default: 'card'})
    paymentMethod: string;

    @Column()
    status: string;

    @Column()
    subscriptionId: string;

    @Column()
    failureReason?: string
    
}
