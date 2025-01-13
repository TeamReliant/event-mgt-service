import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { UsersService } from '@app/rest/users/users.service';
import { join } from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus } from './enums/user-status.enums';
import { TJwtPayload } from '@libs/types';
import { GetAllUsersQueriesDto } from './dto/get-all-user-dto';
import { UserExportDto } from './dto/export-user-dto';
import { plainToInstance } from 'class-transformer';
import { ExportData } from './entities/export-data.entity';
import { events } from '@config/app.config';
import { AllUsersExportEvent } from './events/export-all-users.event';

@Injectable()
export class AdminManagementService {
  private readonly tempDir = join(process.cwd(), 'temp');
  constructor(
    private readonly entityManager: EntityManager,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private searchableFields = [
    'user.firstname',
    'user.lastname',
    'user.email',
    'publicProfile.company_name',
    'publicProfile.address',
    'publicProfile.country',
    'publicProfile.city',
    'publicProfile.website',
  ];
  async getAllUsers(query?: GetAllUsersQueriesDto) {
    const queryBuilder = this.entityManager
      .createQueryBuilder(User, 'user')
      .leftJoinAndSelect('user.publicProfile', 'publicProfile');

    if (query) {
      const { search, dateRangeStart, dateRangeEnd, status } = query;

      if (search) {
        const searchConditions = this.searchableFields
          .map((field) => `${field} ILIKE :search`)
          .join(' OR ');

        queryBuilder.andWhere(`(${searchConditions})`, {
          search: `%${search}%`,
        });
      }

      // Check if status is supplied
      this.handleStatusFilter(queryBuilder, status);

      // Check if date range is supplied

      if (dateRangeStart && dateRangeEnd) {
        const startOfDay = new Date(dateRangeStart);
        startOfDay.setHours(1, 0, 0, 0);

        const endOfDay = new Date(dateRangeEnd);
        endOfDay.setHours(24, 59, 59, 999);

        queryBuilder.andWhere('user.createdAt BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        });
      } else if (dateRangeStart) {
        const startOfDay = new Date(dateRangeStart);
        startOfDay.setHours(0, 0, 0, 0);

        queryBuilder.andWhere('user.createdAt >= :start', {
          start: startOfDay,
        });
      } else if (dateRangeEnd) {
        const endOfDay = new Date(dateRangeEnd);
        endOfDay.setHours(23, 59, 59, 999);

        queryBuilder.andWhere('user.createdAt <= :end', {
          end: endOfDay,
        });
      }
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');
    return queryBuilder;
  }

  async getSingleUser(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new BadRequestException('User does not exist');

    return user;
  }

  async blockUser(userId: string) {
    const userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === true)
      throw new BadRequestException('User is already blocked');

    userExists.blocked = true;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }

  async unblockUser(userId: string) {
    const userExists = await this.usersService.findOne(userId);
    if (!userExists) throw new BadRequestException('User does not exist');
    if (userExists.blocked === false)
      throw new BadRequestException('User is not blocked');

    userExists.blocked = false;
    await this.usersService.findOneByIdAndUpdate(userId, userExists);
  }

  async exportAllUsers(user: TJwtPayload) {
    const users = await (await this.getAllUsers()).getMany();
    const loggedInUser = await this.usersService.findOne(user.userId);
    if (!loggedInUser) throw new BadRequestException('User does not exist');

    const mappedData = users.map((user) => {
      const { publicProfile } = user;
      return {
        fullName: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
        email: user.email,
        createdAt: user.createdAt,
        userType: user.userType,
        lastLoggedIn: user.lastLoggedIn,
        status: this.getUserStatus(user.blocked, user.lastLoggedIn),
        subscribedPlan: user.subscribedPlan ?? 'free',
        phoneNumber: user.phoneNumber ?? '',
        companyName: publicProfile?.companyName ?? '',
        country: publicProfile?.country ?? '',
        city: publicProfile?.city ?? '',
        state: publicProfile?.state ?? '',
        address: publicProfile?.address ?? '',
        zip: publicProfile?.zip ?? '',
        website: publicProfile?.website ?? '',
      };
    });

    // Transform with options
    const records = plainToInstance(UserExportDto, mappedData, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    const exportData = new ExportData();
    exportData.userEmail = loggedInUser.email;
    exportData.recordsToExport = records;

    await this.eventEmitter.emitAsync(
      events.EXPORT_ALL_USERS_CSV,
      new AllUsersExportEvent(exportData),
    );
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

  private handleStatusFilter(
    queryBuilder: SelectQueryBuilder<User>,
    status?: string,
  ) {
    if (!status) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    switch (status) {
      case UserStatus.BLOCKED:
        queryBuilder.andWhere('user.blocked = :blocked', { blocked: true });
        break;

      case UserStatus.ACTIVE:
        queryBuilder
          .andWhere('user.blocked = :blocked', { blocked: false })
          .andWhere('user.lastLoggedIn >= :lastActive', {
            lastActive: sixMonthsAgo,
          });
        break;

      case UserStatus.INACTIVE:
        queryBuilder
          .andWhere('user.blocked = :blocked', { blocked: false })
          .andWhere(
            'user.lastLoggedIn IS NULL OR user.lastLoggedIn < :lastActive',
            {
              lastActive: sixMonthsAgo,
            },
          );
        break;
    }
  }

  // private async ensureTempDirExists(): Promise<void> {
  //   try {
  //     await fs.access(this.tempDir);
  //   } catch {
  //     await fs.mkdir(this.tempDir, { recursive: true });
  //   }
  // }
}
