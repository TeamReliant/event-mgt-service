import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AdminManagementService } from './admin-management.service';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { AllUserDto } from './dto/fetch-all-user.dto';
import { Request } from 'express';

@Controller('admin-management')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Get('get-all-users')
  async getAllUsers(@Req() req: Request) {
    var queryBuilder = await this.adminManagementService.getAllUsers();
    return ResponseSerializer.applyHTEAOSWithDtoFormatter<AllUserDto>(
      req,
      queryBuilder,
      AllUserDto,
    );
  }

  @Post(':id/block-user')
  async blockUser(@Param('id') userId: string) {
    await this.adminManagementService.blockUser(userId);
    return ResponseSerializer.message('User blocked successfully');
  }
  @Post(':id/unblock-user')
  async unblockUser(@Param('id') userId: string) {
    await this.adminManagementService.unblockUser(userId);
    return ResponseSerializer.message('User unblocked successfully');
  }
}
