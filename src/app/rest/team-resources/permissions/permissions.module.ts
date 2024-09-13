import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@app/rest/users/users.module';
import { Permission } from '@app/rest/team-resources/permissions/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), UsersModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
