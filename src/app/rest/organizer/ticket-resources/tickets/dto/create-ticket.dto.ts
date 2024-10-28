import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { TicketCategory } from '../enums';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  availableTickets?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minNumberOfTicketsOrderable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxNumberOfTicketsOrderable?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
