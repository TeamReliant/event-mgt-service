import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeamRolePermissionsService } from './team-role-permissions.service';
import { CreateTeamRolePermissionDto } from './dto/create-team-role-permission.dto';
import { UpdateTeamRolePermissionDto } from './dto/update-team-role-permission.dto';

@Controller('team-role-permissions')
export class TeamRolePermissionsController {
  constructor(
    private readonly teamRolePermissionsService: TeamRolePermissionsService,
  ) {}

  @Post()
  create(@Body() createTeamRolePermissionDto: CreateTeamRolePermissionDto) {
    return this.teamRolePermissionsService.create(createTeamRolePermissionDto);
  }

  @Get()
  findAll() {
    return this.teamRolePermissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamRolePermissionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamRolePermissionDto: UpdateTeamRolePermissionDto,
  ) {
    return this.teamRolePermissionsService.update(
      +id,
      updateTeamRolePermissionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamRolePermissionsService.remove(+id);
  }
}
