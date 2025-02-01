import { PartialType } from '@nestjs/swagger';
import { CreateSystemRegisterDto } from './create-system-register.dto';

export class UpdateSystemRegisterDto extends PartialType(
  CreateSystemRegisterDto,
) {}
