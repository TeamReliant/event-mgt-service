import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateTransactionDto {
    @IsNotEmpty()
    @IsString()
    userId: string;

    @IsNotEmpty()
    @IsString()
    plan: string;

    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    amount: number;

    @IsNotEmpty()
    @IsString()
    currency: string;

    @IsNotEmpty()
    @IsString()
    transactionId: string;

    @IsNotEmpty()
    @IsString()
    paymentMethod: string;

    @IsNotEmpty()
    @IsString()
    status: string;

    @IsNotEmpty()
    @IsString()
    subscriptionId: string;

    @IsString()
    @IsOptional()
    failureReason: string

}
