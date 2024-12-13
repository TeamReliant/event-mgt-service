import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachPermissionsDto } from './dto/attach-permissions.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Permission } from '@app/rest/organizer/team-resources/permissions/entities/permission.entity';
import { TeamMember } from '@app/rest/organizer/team-resources/team-members/entities/team-member.entity';
import { DetachPermissionDto } from '@app/rest/organizer/team-resources/permissions/dto/detach-permission.dto';
import { TeamPermissions } from '@app/rest/organizer/team-resources/permissions/enums/team-permissions';
import { Event } from '@app/rest/organizer/event-resources/events/entities/event.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly _repo: Repository<Permission>,
    private readonly _entityManager: EntityManager,
  ) {}

  async create(createPermissionDto: AttachPermissionsDto, userId: string) {
    const { teamId, memberId, permissions } = createPermissionDto;

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .leftJoinAndSelect('teamMember.team', 'team')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can invite members');

    // find the member to attach the permission to
    const member = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.permissions', 'permissions')
      .where('teamMember.id = :memberId', { memberId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .getOne();

    if (!member) throw new NotFoundException('Team member not found');

    await this._entityManager.transaction(async (manager) => {
      // add the new ones
      if (permissions && permissions.length) {
        // remove the existing permissions
        await manager.remove(Permission, member.permissions);

        const permissionEntities = [];
        for (const permission of permissions) {
          const permissionEntity = manager.create(Permission, {
            name: permission,
            team: adminMember.team,
            member,
          }) as Permission;
          permissionEntities.push(permissionEntity);
        }

        await manager.save(Permission, permissionEntities);
      }
    });

    // return the permissions of the team member
    return this.findAll(teamId, memberId);
  }

  async findAll(teamId: string, memberId: string) {
    // find all permissions for a member
    return await this._entityManager
      .createQueryBuilder(Permission, 'permission')
      // .leftJoinAndSelect('permission.team', 'team')
      // .leftJoinAndSelect('permission.member', 'member')
      .where('permission.teamId = :teamId', { teamId })
      .andWhere('permission.teamMemberId = :memberId', { memberId })
      .getMany();
  }

  async remove(detachPermissionDto: DetachPermissionDto, userId: string) {
    const { teamId, memberId, permissions } = detachPermissionDto;

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .leftJoinAndSelect('teamMember.team', 'team')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can invite members');

    // find the member to attach the permission to
    const member = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .where('teamMember.id = :memberId', { memberId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .getOne();

    if (!member) throw new NotFoundException('Team member not found');

    for (const permission of permissions) {
      // check if the permission already exists using query builder
      const existingPermission = await this._entityManager
        .createQueryBuilder(Permission, 'permission')
        .where('permission.name = :name', { name: permission })
        .andWhere('permission.teamId = :teamId', { teamId })
        .andWhere('permission.teamMemberId = :memberId', { memberId })
        .getOne();

      if (existingPermission) {
        await this._repo.remove(existingPermission);
      }
    }

    // return all permissions for the member
    return this.findAll(teamId, memberId);
  }

  async getUserPermissions(userId: string, eventId: string): Promise<string[]> {
    const teamMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.team', 'team')
      .leftJoinAndSelect('teamMember.user', 'user')
      .leftJoinAndSelect('teamMember.permissions', 'permissions')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('team.eventId = :eventId', { eventId })
      .getOne();

    if (!teamMember) throw new NotFoundException('Team member not found');

    return teamMember.permissions.map((permission) => permission.name);
  }

  async isUserPermitted(
    userId: string,
    eventId: string,
    permission: TeamPermissions,
  ) {
    // fetch the event from the database
    const event = await this._entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.user', 'user')
      .where('event.id = :eventId', { eventId })
      .getOne();

    if (!event) throw new NotFoundException('Event not found');

    // check if the user is the owner of the event
    if (event.user.id === userId) return true;

    // check from the team members
    const teamMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.team', 'team')
      .leftJoinAndSelect('teamMember.user', 'user')
      .leftJoinAndSelect('team.events', 'events')
      .leftJoinAndSelect('teamMember.permissions', 'permissions')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('events.id = :eventId', { eventId })
      .getOne();

    if (!teamMember)
      throw new ForbiddenException(
        'User not permitted to access this resource',
      );

    // check if the team member has the permissions
    if (!teamMember.permissions.some((p) => p.name === permission))
      throw new ForbiddenException(
        'Member not permitted to access this resource',
      );

    return true;
  }
}
