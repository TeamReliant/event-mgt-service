import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachPermissionsDto } from './dto/attach-permissions.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Permission } from '@app/rest/team-resources/permissions/entities/permission.entity';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';
import { DetachPermissionDto } from '@app/rest/team-resources/permissions/dto/detach-permission.dto';

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
      .where('teamMember.id = :memberId', { memberId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .getOne();

    if (!member) throw new NotFoundException('Team member not found');

    // create the permission
    if (permissions && permissions.length) {
      const permissionEntities = [];
      for (const permission of permissions) {
        // check if the permission already exists using query builder
        const existingPermission = await this._entityManager
          .createQueryBuilder(Permission, 'permission')
          .where('permission.name = :name', { name: permission })
          .andWhere('permission.teamId = :teamId', { teamId })
          .andWhere('permission.teamMemberId = :memberId', { memberId })
          .getOne();

        // if the permission exists, skip to the next permission
        if (existingPermission) continue;

        const permissionEntity = this._repo.create({
          name: permission,
          team: adminMember.team,
          member,
        }) as Permission;
        permissionEntities.push(permissionEntity);
      }

      await this._repo.save(permissionEntities);
    }

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
}
