import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TeamPermissionsService } from './team-permissions.service';
import { CreateTeamPermissionDto } from './dto/create-team-permission.dto';
import { UpdateTeamPermissionDto } from './dto/update-team-permission.dto';

@Controller('team-permissions')
export class TeamPermissionsController {
  constructor(
    private readonly teamPermissionsService: TeamPermissionsService,
  ) {}

  @Post()
  create(@Body() createTeamPermissionDto: CreateTeamPermissionDto) {
    return this.teamPermissionsService.create(createTeamPermissionDto);
  }

  @Get()
  findAll() {
    return this.teamPermissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamPermissionsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamPermissionDto: UpdateTeamPermissionDto,
  ) {
    return this.teamPermissionsService.update(+id, updateTeamPermissionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamPermissionsService.remove(+id);
  }
}
