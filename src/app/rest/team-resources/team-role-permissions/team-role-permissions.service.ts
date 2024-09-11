import { Injectable } from '@nestjs/common';
import { CreateTeamRolePermissionDto } from './dto/create-team-role-permission.dto';
import { UpdateTeamRolePermissionDto } from './dto/update-team-role-permission.dto';

@Injectable()
export class TeamRolePermissionsService {
  create(createTeamRolePermissionDto: CreateTeamRolePermissionDto) {
    return 'This action adds a new teamRolePermission';
  }

  findAll() {
    return `This action returns all teamRolePermissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teamRolePermission`;
  }

  update(id: number, updateTeamRolePermissionDto: UpdateTeamRolePermissionDto) {
    return `This action updates a #${id} teamRolePermission`;
  }

  remove(id: number) {
    return `This action removes a #${id} teamRolePermission`;
  }
}
