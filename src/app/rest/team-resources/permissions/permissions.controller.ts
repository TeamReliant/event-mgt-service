import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { AttachPermissionsDto } from './dto/attach-permissions.dto';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { GetCurrentUserId } from '@libs/decorators/get-current-user-id.decorator';
import ResponseSerializer, {
  IResponseWithData,
} from '@libs/helpers/ResponseSerializer';
import { DetachPermissionDto } from '@app/rest/team-resources/permissions/dto/detach-permission.dto';

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // attach permission to a member
  @Post('permissions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPermissionDto: AttachPermissionsDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    const data = await this.permissionsService.create(
      createPermissionDto,
      userId,
    );
    return ResponseSerializer.data(data);
  }

  // find all permissions of a member
  @Get('teams/:teamId/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ): Promise<IResponseWithData> {
    // find all member with a permission
    const data = await this.permissionsService.findAll(teamId, memberId);
    return ResponseSerializer.data(data);
  }

  // detach permission from a member
  @Delete('permissions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Body() detachPermissionDto: DetachPermissionDto,
    @GetCurrentUserId() userId: string,
  ): Promise<IResponseWithData> {
    const data = await this.permissionsService.remove(
      detachPermissionDto,
      userId,
    );
    return ResponseSerializer.data(data);
  }
}
