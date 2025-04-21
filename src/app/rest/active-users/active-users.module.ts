import { Module } from '@nestjs/common';
import { ActiveUsersService } from './active-users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveUser } from '@app/rest/active-users/entities/active-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActiveUser])],
  controllers: [],
  providers: [ActiveUsersService],
  exports: [ActiveUsersService],
})
export class ActiveUsersModule {}
