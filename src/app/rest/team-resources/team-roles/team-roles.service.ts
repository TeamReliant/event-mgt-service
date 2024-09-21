import { Injectable } from '@nestjs/common';
import { CreateTeamRoleDto } from './dto/create-team-role.dto';
import { UpdateTeamRoleDto } from './dto/update-team-role.dto';

@Injectable()
export class TeamRolesService {
  create(createTeamRoleDto: CreateTeamRoleDto) {
    return 'This action adds a new teamRole';
  }

  findAll() {
    return `This action returns all teamRoles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teamRole`;
  }

  update(id: number, updateTeamRoleDto: UpdateTeamRoleDto) {
    return `This action updates a #${id} teamRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} teamRole`;
  }
}
