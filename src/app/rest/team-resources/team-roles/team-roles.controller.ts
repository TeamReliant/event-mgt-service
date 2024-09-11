import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeamRolesService } from './team-roles.service';
import { CreateTeamRoleDto } from './dto/create-team-role.dto';
import { UpdateTeamRoleDto } from './dto/update-team-role.dto';

@Controller('team-roles')
export class TeamRolesController {
  constructor(private readonly teamRolesService: TeamRolesService) {}

  @Post()
  create(@Body() createTeamRoleDto: CreateTeamRoleDto) {
    return this.teamRolesService.create(createTeamRoleDto);
  }

  @Get()
  findAll() {
    return this.teamRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamRolesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamRoleDto: UpdateTeamRoleDto,
  ) {
    return this.teamRolesService.update(+id, updateTeamRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamRolesService.remove(+id);
  }
}
