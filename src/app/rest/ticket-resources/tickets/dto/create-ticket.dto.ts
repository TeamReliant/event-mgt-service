import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TicketCategory } from '../enums';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price: number;

  @IsEnum(TicketCategory)
  @IsOptional()
  category: TicketCategory;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  availableTickets: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  minNumberOfTicketsOrderable: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxNumberOfTicketsOrderable: number;

  @IsString()
  @IsOptional()
  description: string;
}
