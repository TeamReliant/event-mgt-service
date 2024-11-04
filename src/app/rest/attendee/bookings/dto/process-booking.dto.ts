import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';

export class ProcessBookingDto {
  @IsNotEmpty()
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUUID(4, { each: true })
  bookings?: string[];
}
