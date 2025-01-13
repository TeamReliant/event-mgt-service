import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminManagementService } from './admin-management.service';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { AllUserDto } from './dto/fetch-all-user.dto';
import { Request } from 'express';
import { UserStatus } from './enums/user-status.enums';
import { GetAllUsersQueriesDto } from './dto/get-all-user-dto';
import { plainToClass } from 'class-transformer';
import JwtAuthGuard from '@libs/Guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '@libs/decorators/current-user.decorator';
import { TJwtPayload } from '@libs/types';
import { RolesGuard } from '@libs/Guards/rbac/roles.guard';
import { UserType } from '@app/rest/users/enums/user-type';

@Controller('admin-management')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Get('get-all-users')
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async getAllUsers(
    @Req() req: Request,
    @Query() query: GetAllUsersQueriesDto,
  ) {
    const queryBuilder = await this.adminManagementService.getAllUsers(query);
    const response = await ResponseSerializer.applyHTEAOSWithDtoFormatter(
      req,
      queryBuilder,
      AllUserDto,
    );
    response.data = response.data.map((user) => {
      const { publicProfile, ...userData } = user;
      return {
        ...userData,
        status: this.getUserStatus(user.blocked, user.lastLoggedIn),
        companyName: publicProfile?.companyName || '',
        country: publicProfile?.country || '',
        city: publicProfile?.city || '',
        state: publicProfile?.state || '',
        zip: publicProfile?.zip || '',
        address: publicProfile?.address || '',
        website: publicProfile?.website || '',
      };
    });
    return response;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async getSingleUser(@Param('id') userId: string) {
    const user = await this.adminManagementService.getSingleUser(userId);
    const { publicProfile, ...userData } = user;
    const userDto = plainToClass(
      AllUserDto,
      { ...userData },
      { excludeExtraneousValues: true },
    );
    return ResponseSerializer.data({
      ...userDto,
      status: this.getUserStatus(user.blocked, user.lastLoggedIn),
      companyName: publicProfile?.companyName || '',
      country: publicProfile?.country || '',
      city: publicProfile?.city || '',
      state: publicProfile?.state || '',
      zip: publicProfile?.zip || '',
      address: publicProfile?.address || '',
      website: publicProfile?.website || '',
    });
  }

  @Post('export-all-users')
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async exportAllUsers(@CurrentUser() user: TJwtPayload) {
    await this.adminManagementService.exportAllUsers(user);
    return ResponseSerializer.message('Successfully exported users to email');
  }

  @Post(':id/block-user')
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async blockUser(@Param('id') userId: string) {
    await this.adminManagementService.blockUser(userId);
    return ResponseSerializer.message('User blocked successfully');
  }
  @Post(':id/unblock-user')
  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  async unblockUser(@Param('id') userId: string) {
    await this.adminManagementService.unblockUser(userId);
    return ResponseSerializer.message('User unblocked successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard([UserType.ADMIN]))
  private getUserStatus(blocked: boolean, lastLoggedIn: Date): UserStatus {
    if (blocked) {
      return UserStatus.BLOCKED;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (!lastLoggedIn || new Date(lastLoggedIn) < sixMonthsAgo) {
      return UserStatus.INACTIVE;
    }

    return UserStatus.ACTIVE;
  }
}
