import { Injectable } from '@nestjs/common';
import { CreateTeamPermissionDto } from './dto/create-team-permission.dto';
import { UpdateTeamPermissionDto } from './dto/update-team-permission.dto';

@Injectable()
export class TeamPermissionsService {
  create(createTeamPermissionDto: CreateTeamPermissionDto) {
    return 'This action adds a new teamPermission';
  }

  findAll() {
    return `This action returns all teamPermissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teamPermission`;
  }

  update(id: number, updateTeamPermissionDto: UpdateTeamPermissionDto) {
    return `This action updates a #${id} teamPermission`;
  }

  remove(id: number) {
    return `This action removes a #${id} teamPermission`;
  }
}
