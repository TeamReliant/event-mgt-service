import { CreateSubscriberDto } from './create-subscriber.dto';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';

export class UpdateSubscriberDto extends CreateSubscriberDto {
  @IsNotEmpty()
  @IsEnum(['true', 'false'], {
    message: 'subscribed should either be true or false, sent as a string',
  })
  @FormatValidationException()
  subscribed: string;
}
