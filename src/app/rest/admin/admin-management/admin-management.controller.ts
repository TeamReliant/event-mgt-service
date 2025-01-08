import { Controller, Get, Param, Post, Req} from '@nestjs/common';
import { AdminManagementService } from './admin-management.service';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';
import { AllUserDto } from './dto/fetch-all-user.dto';
import { Request } from 'express';
import { UserStatus } from './enums/user-status.enums';

@Controller('admin-management')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Get('get-all-users')
  async getAllUsers(@Req() req: Request) {
    var queryBuilder = await this.adminManagementService.getAllUsers();
    var response = await ResponseSerializer.applyHTEAOSWithDtoFormatter(
      req,
      queryBuilder,
      AllUserDto,
    );
    response.data = response.data.map((user) => {
      const { publicProfile, ...userData } = user;
      return {
        ...userData,
        status: this.getUserStatus(user.blocked, user.lastLoggedIn),
        companyName: publicProfile.companyName,
        country: publicProfile.country,
        city: publicProfile.city,
        address: publicProfile.address,
        website: publicProfile.website,
      };
    });
    return response;
  }

  // @Post('export-all-users')
  // @UseGuards(JwtAuthGuard)
  // async exportAllUsers(@CurrentUser() user: TJwtPayload) {
  //   await this.adminManagementService.exportAllUsers(user);
  //   return ResponseSerializer.message('Successfully exported users to email');
  // }

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
