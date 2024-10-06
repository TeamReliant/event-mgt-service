import { User } from "@app/rest/users/entities/user.entity";

export class Payment {
    user?: User;
    failureReason?: string;
    payout?: any;

}
