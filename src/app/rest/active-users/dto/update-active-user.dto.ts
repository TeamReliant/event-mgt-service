import { PartialType } from '@nestjs/swagger';
import { CreateActiveUserDto } from './create-active-user.dto';

export class UpdateActiveUserDto extends PartialType(CreateActiveUserDto) {}
