import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamMember } from '@app/rest/team-resources/team-members/entities/team-member.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly _repo: Repository<TeamMember>,
    private readonly _entityManager: EntityManager,
  ) {}

  findAll(teamId: string): SelectQueryBuilder<TeamMember> {
    return this._repo
      .createQueryBuilder('members')
      .leftJoinAndSelect('members.user', 'user')
      .where('members.teamId = :teamId', { teamId })
      .select([
        'members',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'user.picture',
      ]);
  }

  async findOne(
    teamId: string,
    id: string,
    throwException = true,
  ): Promise<TeamMember> {
    const member = await this._repo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.id = :id', { id })
      .andWhere('member.teamId = :teamId', { teamId })
      .select([
        'member',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'user.picture',
      ])
      .getOne();

    // check if a member was found
    if (!member && throwException)
      throw new NotFoundException(`Team member with id ${id} not found`);

    return member;
  }

  async update(
    teamId: string,
    id: string,
    userId: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const member = await this.findOne(teamId, id);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can update members');

    // update the team member
    Object.assign(member, updateTeamMemberDto);

    // save the updated team member
    return this._repo.save(member);
  }

  async remove(teamId: string, id: string, userId: string): Promise<boolean> {
    const member = await this.findOne(teamId, id);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can update members');

    // make sure the user is not removing itself
    if (member.user?.id === userId)
      throw new NotFoundException('You cannot remove yourself from the team');

    // remove the team member
    await this._repo.remove(member);

    return true;
  }
}
