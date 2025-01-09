import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { UsersService } from '@app/rest/users/users.service';
import { join } from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AdminManagementService {
  private readonly tempDir = join(process.cwd(), 'temp');
  constructor(
    private readonly entityManager: EntityManager,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAllUsers() {
    var queryBuilder = await this.entityManager
      .createQueryBuilder(User, 'user')
      .leftJoinAndSelect('user.publicProfile', 'publicProfile')
      .orderBy('user.createdAt', 'DESC');

    return queryBuilder;
  }

  async blockUser(userId: string) {
    var userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === true)
      throw new BadRequestException('User is already blocked');

    userExists.blocked = true;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }

  async unblockUser(userId: string) {
    var userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === false)
      throw new BadRequestException('User is not blocked');

    userExists.blocked = false;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }

  // async exportAllUsers(user: TJwtPayload) {
  //   const users = await (await this.getAllUsers()).getMany();
  //   const loggedInUser = await this.usersService.findOne(user.userId);
  //   if (!loggedInUser) throw new BadRequestException('User does not exist');

  //   console.log(`>>>>>>>>>>>>>>>>>>${loggedInUser.email}<<<<<<<<<<<<<<<<<<`);

  //   await this.ensureTempDirExists();

  //   const records = users.map((user) => {
  //     const { publicProfile, ...userData } = user;
  //     console.log(`>>>>>>>>${userData.email}<<<<<<<<<<<<<`);
  //     return {
  //       Name: `${userData.firstname} ${userData.lastname}`,
  //       'Email Address': userData.email,
  //       'Date Added': userData.createdAt,
  //       'User Type': userData.userType,
  //       'Last Active': userData.lastLoggedIn,
  //       status: this.getUserStatus(userData.blocked, userData.lastLoggedIn),
  //       'Company Name': publicProfile.companyName,
  //       Plan: userData.subscribedPlan,
  //       'Phone Number': userData.phoneNumber,
  //       country: publicProfile.country,
  //       city: publicProfile.city,
  //       address: publicProfile.address,
  //       website: publicProfile.website,
  //     };
  //   });

  //   const fields = [
  //     'Name',
  //     'Email Address',
  //     'Date Added',
  //     'User Type',
  //     'Last Active',
  //     'Status',
  //     'Company Name',
  //     'Plan',
  //     'Phone Number',
  //     'Country',
  //     'City',
  //     'Address',
  //     'Website Url',
  //   ];
  //   const parser = new Parser({ fields });
  //   const csv = parser.parse(records);

  //   //save to temp file
  //   const tempFile = join(process.cwd(), 'temp', `users-${Date.now()}.csv`);
  //   await fs.writeFile(tempFile, csv, 'utf8');

  //   const exportData = new ExportData();
  //   exportData.user = loggedInUser;
  //   exportData.dataFile = tempFile;

  //   await this.eventEmitter.emitAsync(
  //     events.EXPORT_ALL_USERS_CSV,
  //     new AllUsersExportEvent(exportData),
  //   );

  //   await fs.unlink(tempFile);
  // }

  // private getUserStatus(blocked: boolean, lastLoggedIn: Date): UserStatus {
  //   if (blocked) {
  //     return UserStatus.BLOCKED;
  //   }

  //   const sixMonthsAgo = new Date();
  //   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  //   if (!lastLoggedIn || new Date(lastLoggedIn) < sixMonthsAgo) {
  //     return UserStatus.INACTIVE;
  //   }

  //   return UserStatus.ACTIVE;
  // }

  // private async ensureTempDirExists(): Promise<void> {
  //   try {
  //     await fs.access(this.tempDir);
  //   } catch {
  //     await fs.mkdir(this.tempDir, { recursive: true });
  //   }
  // }
}
