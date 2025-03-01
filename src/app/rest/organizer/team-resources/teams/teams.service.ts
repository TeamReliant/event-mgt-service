import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { EntityManager, Repository } from 'typeorm';
import { TeamMember } from '../team-members/entities/team-member.entity';
import { UsersService } from '@app/rest/users/users.service';
import { Team } from '@app/rest/organizer/team-resources/teams/entities/team.entity';
import { generateRandomString } from '@libs/helpers/char-generator';
import { TeamInvitation } from '@app/rest/organizer/team-resources/team-invitations/entities/team-invitation.entity';
import { TeamInvitationsService } from '@app/rest/organizer/team-resources/team-invitations/team-invitations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { events } from '@config/app.config';
import { TeamInvitationsEvent } from '@app/rest/organizer/team-resources/team-invitations/events/team-invitations.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Permission } from '@app/rest/organizer/team-resources/permissions/entities/permission.entity';
import { Task } from '@app/rest/organizer/event-resources/tasks/entities/task.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly _repo: Repository<Team>,
    private readonly _eventEmitter: EventEmitter2,
    private readonly _entityManager: EntityManager,
    private readonly _usersService: UsersService,
    private readonly _teamInvitationsService: TeamInvitationsService,
  ) {}

  async create(createTeamDto: CreateTeamDto, userId: string) {
    // fetch the current user data
    const user = await this._usersService.findOneById(userId);

    if (user.userType !== 'organizer')
      throw new NotAcceptableException('Only organizers can create a team');

    if (user.subscribedPlan === 'free')
      throw new BadRequestException("You can't create a team with a free plan");

    const { name, bio, website, primaryColor, secondaryColor, members } =
      createTeamDto;

    // check if the team name already exists that belongs to the user
    const teamExists = await this._repo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .where('team.name = :name', { name })
      .andWhere('members.userId = :userId', { userId })
      .getOne();

    if (teamExists)
      throw new NotAcceptableException(`Team with name ${name} already exists`);

    // check if any of the emails belong to the current user
    if (members.includes(user.email))
      throw new NotAcceptableException(
        `You cannot invite yourself: ${user.email}`,
      );

    const team = await this._entityManager.transaction(async (manager) => {
      const team = manager.create(Team, {
        name,
        bio,
        website,
        primaryColor,
        secondaryColor,
        admin: user,
      }) as Team;

      // save the team to the database
      const savedTeam = await manager.save<Team>(team);

      // create the team member with the user
      const teamMember = manager.create(TeamMember, {
        team: savedTeam,
        user,
        status: 'active',
        isAdmin: true,
      }) as TeamMember;
      // save the team member data to database
      await manager.save<TeamMember>(teamMember);

      const permissionEntities = [
        'analytics',
        'budgeting',
        'event builder',
        'task',
        'ticket scanning',
      ].map(
        (permission) =>
          manager.create(Permission, {
            name: permission,
            team,
            member: teamMember,
          }) as Permission,
      );
      await manager.save<Permission>(permissionEntities);

      // return the saved team data
      return savedTeam;
    });

    if (members && members.length) {
      // Create members invitations for members
      await this._teamInvitationsService.create(
        { emails: members },
        team.id,
        userId,
      );
    }
    return this.findOne(team.id, true);
  }

  findAll(userId: string, req: Request) {
    const { query } = req;

    // create a query builder
    const queryBuilder = this._repo
      .createQueryBuilder('teams')
      .leftJoinAndSelect('teams.members', 'members')
      .leftJoinAndSelect('members.permissions', 'permissions')
      .leftJoinAndSelect('teams.admin', 'admin')
      .leftJoinAndSelect('admin.publicProfile', 'publicProfile')
      .where('members.userId = :userId', { userId })
      .select([
        'teams',
        'permissions',
        'admin.id',
        'admin.firstname',
        'admin.lastname',
        'admin.email',
        'admin.picture',
        'publicProfile',
        'members',
        // 'members.id',
        // 'members.status',
      ]);

    // check for search query and apply it to the query builder
    if (query.search) {
      const search = query.search as string;
      queryBuilder.andWhere(`teams.name ILIKE :search`, {
        search: `%${search}%`,
      });
    }

    queryBuilder.orderBy('teams.id', 'DESC');
    // return the query builder
    return queryBuilder;
  }

  async findOneByName(name: string, throwException: boolean = false) {
    const team = await this._repo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('team.name = :id', { name })
      .getOne();

    // check if the team exists
    if (!team && throwException) {
      throw new NotFoundException(`Team with name ${name} not found`);
    }

    // return the found team data
    return team;
  }

  async findOne(id: string, throwException: boolean = false) {
    const team = await this._repo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.admin', 'admin')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.permissions', 'permissions')
      .leftJoinAndSelect('members.invitation', 'invitation')
      .leftJoinAndSelect('members.user', 'user')
      .where('team.id = :id', { id })
      .select([
        'team',
        'admin.id',
        'admin.firstname',
        'admin.lastname',
        'admin.email',
        'admin.picture',
        'admin.visibility',
        'admin.userType',
        'admin.createdAt',
        'admin.updatedAt',
        'admin.numOfEventsCreated',
        'admin.numOfPrivateEventsCreated',
        'members',
        'permissions',
        'invitation.id',
        'invitation.email',
        'invitation.createdAt',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
        'user.picture',
        'user.visibility',
        'user.userType',
        'user.createdAt',
        'user.updatedAt',
        'user.numOfEventsCreated',
        'user.numOfPrivateEventsCreated',
      ])
      .getOne();

    // check if the team exists
    if (!team && throwException) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    // return the found team data
    return team;
  }

  async update(id: string, userId: string, updateTeamDto: UpdateTeamDto) {
    // fetch the current user data
    const user = await this._usersService.findOneById(userId);
    // destructure the update team dto
    const { name, primaryColor, secondaryColor, bio, website, members } =
      updateTeamDto;

    // check if the team name already exists that belongs to the user and not the current team
    if (name) {
      const teamExists = await this._repo
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.members', 'members')
        .where('team.name = :name', { name })
        .andWhere('members.userId = :userId', { userId })
        .andWhere('team.id != :id', { id })
        .getOne();

      if (teamExists)
        throw new NotAcceptableException(
          `Team with name ${name} already exists`,
        );
    }

    const team = await this._repo.findOneBy({ id });
    if (!team) throw new NotFoundException(`Team with id ${id} not found`);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId: id })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can update the team');

    // check if any of the emails belong to the current user
    if (members.includes(user.email))
      throw new NotAcceptableException(
        `You cannot invite yourself: ${user.email}`,
      );

    // fetch the team data
    await this._entityManager.transaction(async (manager) => {
      // Modify the entity with new data
      Object.assign(team, { name, primaryColor, secondaryColor, bio, website });

      // Save the updated entity
      await manager.save<Team>(team);

      // Create members invitations for members
      if (members && members.length) {
        // fetch the team members with query builder along with the user data
        const teamMembers = (await manager
          .createQueryBuilder(TeamMember, 'members')
          .leftJoinAndSelect('members.user', 'user')
          .where('members.teamId = :teamId', { teamId: team.id })
          .select(['members', 'user.email'])
          .getMany()) as TeamMember[];

        // create a list of team members email
        const teamMembersEmails = teamMembers.map(
          (member) => member.user.email,
        );
        // create a list of team members email that is not part of the members payload
        const membersToBeRemoved = teamMembersEmails.filter(
          (teamMemberEmail) => !members.includes(teamMemberEmail),
        );

        // Remove team members that is not part of the members payload
        for (const memberEmail of membersToBeRemoved) {
          const member = teamMembers.find(
            (member) => member.user.email === memberEmail,
          );
          //ensure the member is not the admin owner of the team
          if (member.isAdmin && member.user.email === user.email) continue;
          await manager.remove<TeamMember>(member);
        }

        for (const memberEmail of members) {
          // check if the member email is part of the team members
          if (teamMembersEmails.includes(memberEmail)) continue;

          // check if the user has been invited to the team previously
          const existingInvitation = await manager
            .createQueryBuilder(TeamInvitation, 'invitations')
            .where('invitations.teamId = :teamId', { teamId: team.id })
            .andWhere('invitations.email = :email', { email: memberEmail })
            .getOne();
          if (existingInvitation) continue;

          const memberUser =
            await this._usersService.findOneByEmail(memberEmail);

          // create the team member invitation
          const token = await this.generateTeamInvitationToken();

          const invitation = manager.create(TeamInvitation, {
            team,
            user: memberUser,
            token,
            email: memberEmail,
          }) as TeamInvitation;
          // save the invitation(notification to be worked on later)
          await manager.save<TeamInvitation>(invitation);
          this._eventEmitter.emit(
            events.TEAM_MEMBER_INVITED,
            new TeamInvitationsEvent(invitation),
          );
        }
      }
      // return the updated team data
      return team;
    });

    // return the updated team data
    return this.findOne(team.id, true);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    // fetch the current user data
    const user = await this._usersService.findOneById(userId);

    if (user.userType !== 'organizer')
      throw new NotAcceptableException('Only organizers can remove a team');

    // fetch the team data with the members, invitations using query builder
    const team = (await this._entityManager
      .createQueryBuilder(Team, 'team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('team.invitations', 'invitations')
      .leftJoinAndSelect('team.permissions', 'permissions')
      .where('team.id = :id', { id })
      .getOne()) as Team;

    // check if the team exists
    if (!team) throw new NotFoundException(`Team with id ${id} not found`);

    // check if the user is an admin of the team
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId: id })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can remove a team');

    await this._entityManager.transaction(async (manager) => {
      // Fetch the tasks of the team member
      const tasks = await manager
        .createQueryBuilder(Task, 'task')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('assignee.team', 'team')
        .where('team.id = :teamId', { teamId: id })
        .getMany();

      // Loop through the tasks and update each
      for (const task of tasks) {
        task.assignee = null;
        await manager.save(task); // Save the updated task
      }

      // remove the team permissions from the database
      await manager.softRemove(Permission, team.permissions);

      // remove the team members from the database
      await manager.softRemove(TeamMember, team.members);

      // remove the team invitations from the database
      await manager.softRemove(TeamInvitation, team.invitations);

      // remove the team from the database
      await manager.softRemove(Team, team);
    });

    return true;
  }

  async generateTeamInvitationToken(): Promise<string> {
    const token = generateRandomString(100);
    // check if there's already a user with the token
    if (await this._teamInvitationsService.findOneByToken(token)) {
      return this.generateTeamInvitationToken();
    }

    return token;
  }
}
