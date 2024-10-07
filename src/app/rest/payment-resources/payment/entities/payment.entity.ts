import { User } from "@app/rest/users/entities/user.entity";

export class Payment {
    user?: User;
    planName?: string;
    transactionObj?: any;
    payout?: any;
}
