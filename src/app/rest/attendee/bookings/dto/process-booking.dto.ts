import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ProcessBookingDto {
  @IsNotEmpty()
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUUID(4, { each: true })
  bookings?: string[];

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  cancelUrl?: string;
}
