import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ActiveUsersModule } from '@app/rest/active-users/active-users.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ActiveUsersModule],
  controllers: [],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
