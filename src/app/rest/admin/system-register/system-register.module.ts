import { Module } from '@nestjs/common';
import { SystemRegisterService } from './system-register.service';
import { SystemRegisterController } from './system-register.controller';

@Module({
  controllers: [SystemRegisterController],
  providers: [SystemRegisterService],
})
export class SystemRegisterModule {}
