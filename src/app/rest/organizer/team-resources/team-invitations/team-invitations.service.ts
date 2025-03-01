import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { UpdateTeamInvitationDto } from './dto/update-team-invitation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TeamInvitation } from '@app/rest/organizer/team-resources/team-invitations/entities/team-invitation.entity';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { generateRandomString } from '@libs/helpers/char-generator';
import { Team } from '@app/rest/organizer/team-resources/teams/entities/team.entity';
import { TeamMember } from '@app/rest/organizer/team-resources/team-members/entities/team-member.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { events } from '@config/app.config';
import { TeamInvitationsEvent } from './events/team-invitations.event';
import { ResendTeamInvitationDto } from '@app/rest/organizer/team-resources/team-invitations/dto/resend-team-invitation.dto';
import { Permission } from '@app/rest/organizer/team-resources/permissions/entities/permission.entity';
import { UserType } from '@app/rest/users/enums/user-type';
import { freemem } from 'os';

@Injectable()
export class TeamInvitationsService {
  constructor(
    @InjectRepository(TeamInvitation)
    private readonly _repo: Repository<TeamInvitation>,
    private readonly _entityManager: EntityManager,
    private readonly _eventEmitter: EventEmitter2,
  ) {}

  async create(
    createTeamInvitationDto: { emails: string[] },
    teamId: string,
    userId: string,
  ) {
    const { emails } = createTeamInvitationDto;
    if (!emails || emails.length === 0)
      throw new NotAcceptableException('Emails are required');

    // find the team with the teamId string
    const team = await this._entityManager.findOneBy<Team>(Team, {
      id: teamId,
    });

    if (!team) throw new NotFoundException(`Team with id ${teamId} not found`);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can invite members');

    // check if any of the emails belong to the current user
    if (emails.includes(adminMember.user.email))
      throw new NotAcceptableException(
        `You cannot invite yourself: ${adminMember.user.email}`,
      );

    const invalidEmails = [];
    for (const email of emails) {
      const invitedUser = await this._entityManager.findOneBy<User>(User, {
        email,
      });

      if (invitedUser && invitedUser.userType !== UserType.ORGANIZER) {
        invalidEmails.push(email);
      }
    }
    if (invalidEmails.length > 0)
      throw new NotAcceptableException(
        `Only organizers can be invited to a team: ${invalidEmails.join(', ')}`,
      );

    const invitations = await this._entityManager.transaction(
      async (manager) => {
        const invitations = [];

        for (const email of emails) {
          // check if the user has been invited to the team previously
          const existingInvitation = (await manager
            .createQueryBuilder(TeamInvitation, 'invitations')
            .where('invitations.teamId = :teamId', { teamId: team.id })
            .andWhere('invitations.email = :email', { email })
            .getOne()) as TeamInvitation;
          if (existingInvitation) continue;

          // check if the user exists
          const invitedUser = await this._entityManager.findOneBy<User>(User, {
            email,
          });

          //generate invitation token
          const token = await this.generateTeamInvitationToken();

          const invitationEntity = manager.create(TeamInvitation, {
            team: team,
            user: invitedUser,
            token,
            email: email,
          }) as TeamInvitation;

          const invitation = await manager.save(invitationEntity);

          this._eventEmitter.emit(
            events.TEAM_MEMBER_INVITED,
            new TeamInvitationsEvent(invitation),
          );

          // push the invitation to invitations array.
          invitations.push(invitation);

          // create the member account for the invited team member
          const memberEntity = manager.create(TeamMember, {
            team: team,
            user: invitedUser,
            invitation,
          }) as TeamMember;

          await manager.save<TeamMember>(memberEntity);
        }

        return invitations;
      },
    );

    // // emit the event for the invitations
    // for (const invitation of invitations) {
    //   this._eventEmitter.emit(
    //     events.TEAM_MEMBER_INVITED,
    //     new TeamInvitationsEvent(invitation),
    //   );
    // }
    // remove sensitive user and invitation data
    return invitations.map((invitation) => {
      delete invitation.token;
      delete invitation.user?.password;
      delete invitation.user?.emailVerificationToken;
      delete invitation.user?.emailVerifiedAt;
      delete invitation.user?.passwordResetToken;
      delete invitation.user?.magicSignInToken;
      delete invitation.user?.refreshToken;
      return invitation;
    });
  }

  private validateTeamCreation(numberOfTeamMembers: number, plan: string) {
    var planRestrictions = {
      Pro: 5,
      Premium: 10,
    };

    if (numberOfTeamMembers >= planRestrictions[plan.toLowerCase()])
      throw new BadRequestException(
        'You have reached the maximum number of team members for your plan',
      );
  }

  async inviteUser(
    createTeamInvitationDto: CreateTeamInvitationDto,
    teamId: string,
    userId: string,
  ): Promise<TeamInvitation> {
    const { email, permissions } = createTeamInvitationDto;

    // find the team with the teamId string
    const team = await this._entityManager.findOneBy<Team>(Team, {
      id: teamId,
    });

    if (!team) throw new NotFoundException(`Team with id ${teamId} not found`);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can invite members');

    this.validateTeamCreation(
      team.numberOfTeamMembers,
      adminMember.user.subscribedPlan,
    );

    // check if any of the emails belong to the current user
    if (email === adminMember.user.email)
      throw new NotAcceptableException(
        `You cannot invite yourself: ${adminMember.user.email}`,
      );

    const invitedUser = await this._entityManager.findOneBy<User>(User, {
      email,
    });

    if (invitedUser && invitedUser.userType !== UserType.ORGANIZER)
      throw new NotAcceptableException(
        'Only organizers can be invited to a team',
      );

    const invitation = await this._entityManager.transaction(
      async (manager) => {
        // check if the user has been invited to the team previously
        const existingInvitation = (await manager
          .createQueryBuilder(TeamInvitation, 'invitations')
          .where('invitations.teamId = :teamId', { teamId: team.id })
          .andWhere('invitations.email = :email', { email })
          .getOne()) as TeamInvitation;
        if (existingInvitation)
          throw new NotAcceptableException(
            `User with email ${email} has already been invited to the team`,
          );

        // find the member user data(registered/not registered)
        const invitedUser = await this._entityManager.findOneBy<User>(User, {
          email,
        });

        if (invitedUser && invitedUser.userType !== UserType.ORGANIZER)
          throw new NotAcceptableException(
            'Only organizers can be invited to a team',
          );

        //generate invitation token
        const token = await this.generateTeamInvitationToken();

        const invitationEntity = manager.create(TeamInvitation, {
          team: team,
          user: invitedUser,
          token,
          email: email,
        }) as TeamInvitation;

        // save the invitations(notification to be worked on later)
        const invitation = await manager.save<TeamInvitation>(invitationEntity);

        // create the member account for the invited team member
        const memberEntity = manager.create(TeamMember, {
          team: team,
          user: invitedUser,
          invitation,
        });

        const member = await manager.save<TeamMember>(memberEntity);

        // create the permissions for the member
        if (permissions && permissions.length) {
          const permissionEntities = permissions.map(
            (permission) =>
              manager.create(Permission, {
                name: permission,
                team,
                member,
              }) as Permission,
          );
          await manager.save<Permission>(permissionEntities);
        }

        return invitation;
      },
    );

    // emit the event for the invitations
    this._eventEmitter.emit(
      events.TEAM_MEMBER_INVITED,
      new TeamInvitationsEvent(invitation),
    );

    // remove sensitive user and invitation data
    delete invitation.token;
    delete invitation.user?.password;
    delete invitation.user?.emailVerificationToken;
    delete invitation.user?.emailVerifiedAt;
    delete invitation.user?.passwordResetToken;
    delete invitation.user?.magicSignInToken;
    delete invitation.user?.refreshToken;
    return invitation;
  }

  findAll(teamId: string): SelectQueryBuilder<TeamInvitation> {
    return this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .where('teamInvitations.teamId = :teamId', { teamId })
      .select([
        'teamInvitations.id',
        'teamInvitations.email',
        'teamInvitations.status',
        'teamInvitations.createdAt',
        'teamInvitations.updatedAt',
        'user.id',
        'user.email',
        'user.firstname',
        'user.lastname',
        'user.picture',
      ])
      .orderBy('teamInvitations.createdAt', 'DESC');
  }

  async findOne(teamId: string, id: string): Promise<TeamInvitation> {
    return await this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.team', 'team')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .leftJoinAndSelect('team.admin', 'admin')
      .leftJoinAndSelect('admin.publicProfile', 'publicProfile')
      .where('teamInvitations.teamId = :teamId', { teamId })
      .andWhere('teamInvitations.id = :id', { id })
      .select([
        'teamInvitations.id',
        'teamInvitations.email',
        'teamInvitations.status',
        'teamInvitations.createdAt',
        'teamInvitations.updatedAt',
        'team',
        'admin.id',
        'admin.email',
        'admin.firstname',
        'admin.lastname',
        'admin.picture',
        'publicProfile',
        'user.id',
        'user.email',
        'user.firstname',
        'user.lastname',
        'user.picture',
      ])
      .getOne();
  }

  findOneByToken(token: string): Promise<TeamInvitation> {
    return this._repo.findOneBy({ token });
  }

  async findByTokenAndUserId(token: string) {
    // fetch the user account
    // const loggedInUser = await this._entityManager.findOneBy<User>(User, {
    //   id: userId,
    // });

    const invitation = await this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.team', 'team')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .leftJoinAndSelect('team.admin', 'admin')
      .leftJoinAndSelect('admin.publicProfile', 'publicProfile')
      .where('teamInvitations.token = :token', { token })
      // .andWhere('teamInvitations.email = :email', { email: loggedInUser.email })
      .select([
        'teamInvitations.id',
        'teamInvitations.email',
        'teamInvitations.status',
        'teamInvitations.createdAt',
        'teamInvitations.updatedAt',
        'team',
        'admin.id',
        'admin.email',
        'admin.firstname',
        'admin.lastname',
        'admin.picture',
        'publicProfile',
        'user.id',
        'user.email',
        'user.firstname',
        'user.lastname',
        'user.picture',
      ])
      .getOne();

    if (!invitation) throw new NotFoundException('Invitation not found');
    return invitation;
  }

  async resendInvitation(
    teamId: string,
    userId: string,
    resendTeamInvitationDto: ResendTeamInvitationDto,
  ): Promise<TeamInvitation> {
    const { email } = resendTeamInvitationDto;

    // find the invitation where the id = id and teamId id teamId
    const invitation = await this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .leftJoinAndSelect('teamInvitations.team', 'team')
      .where('teamInvitations.teamId = :teamId', { teamId })
      .andWhere('user.email = :email', { email })
      .getOne();

    if (!invitation)
      throw new NotFoundException(`Invitation with email ${email} not found`);

    // find the team member where the userId is an admin and the teamId is the teamId
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotFoundException('Only team admins can invite members');

    // check if the invitations has been accepted or declined
    if (invitation.status !== 'pending')
      throw new NotAcceptableException(
        'Invitation has already been responded to',
      );

    // dispatch the event for the invitation
    this._eventEmitter.emit(
      events.TEAM_MEMBER_INVITED,
      new TeamInvitationsEvent(invitation),
    );

    return invitation;
  }

  async update(
    updateTeamInvitationDto: UpdateTeamInvitationDto,
    userId: string,
  ): Promise<TeamInvitation> {
    const { status, token } = updateTeamInvitationDto;

    // fetch the user account
    const loggedInUser = await this._entityManager.findOneBy<User>(User, {
      id: userId,
    });

    // find the invitation where the id = id and teamId id teamId
    const invitation = await this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.team', 'team')
      .leftJoinAndSelect('team.admin', 'admin')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .where('teamInvitations.token = :token', { token })
      .andWhere('teamInvitations.email = :email', { email: loggedInUser.email })
      .select([
        'teamInvitations.id',
        'teamInvitations.email',
        'teamInvitations.status',
        'teamInvitations.createdAt',
        'teamInvitations.updatedAt',
        'admin.id',
        'admin.email',
        'admin.firstname',
        'admin.lastname',
        'admin.picture',
        'team',
        'user.id',
        'user.email',
        'user.firstname',
        'user.lastname',
        'user.picture',
      ])
      .getOne();

    // check if the invitation exists
    if (!invitation) throw new NotFoundException(`Team invitation not found`);

    // check if the invitations has been accepted or declined
    if (invitation.status !== 'pending')
      throw new NotAcceptableException(
        'Invitation has already been responded to',
      );

    if (loggedInUser.userType !== UserType.ORGANIZER)
      throw new NotAcceptableException(
        'An attendee cannot be invited to a team using an attendee account.  Please register as an organizer using a different email to be a part of a team',
      );

    return this._entityManager.transaction(async (manager) => {
      // update the invitation status
      invitation.status = status;
      invitation.token = null;
      await manager.save<TeamInvitation>(invitation);

      // if the invitation was accepted, add the user to the team
      if (status === 'accepted') {
        invitation.user = loggedInUser;
        await manager.save<TeamInvitation>(invitation);

        const member = await manager
          .createQueryBuilder(TeamMember, 'member')
          .leftJoinAndSelect('member.user', 'user')
          .where('member.invitationId = :invitationId', {
            invitationId: invitation.id,
          })
          .andWhere('member.teamId = :teamId', { teamId: invitation.team.id })
          .getOne();

        member.status = 'active';
        member.user = loggedInUser;
        await manager.save<TeamMember>(member);

        // dispatch the event for the invitation
        this._eventEmitter.emit(
          events.TEAM_INVITATION_ACCEPTED,
          new TeamInvitationsEvent(invitation),
        );
        return invitation;
      }

      // dispatch the event for the invitation declined(Not handled yet)
      this._eventEmitter.emit(
        events.TEAM_INVITATION_DECLINED,
        new TeamInvitationsEvent(invitation),
      );

      return invitation;
    });
  }

  async remove(teamId: string, id: string, userId: string): Promise<boolean> {
    // find the admin members of the team and select their user id
    const adminMember = await this._entityManager
      .createQueryBuilder(TeamMember, 'teamMember')
      .leftJoinAndSelect('teamMember.user', 'user')
      .where('teamMember.userId = :userId', { userId })
      .andWhere('teamMember.teamId = :teamId', { teamId })
      .andWhere('teamMember.isAdmin = true')
      .getOne();

    if (!adminMember)
      throw new NotAcceptableException(
        'Only team admins can remove team members',
      );

    const invitation = await this._repo
      .createQueryBuilder('teamInvitations')
      .leftJoinAndSelect('teamInvitations.user', 'user')
      .leftJoinAndSelect('teamInvitations.member', 'member')
      .leftJoinAndSelect('member.permissions', 'permissions')
      .leftJoinAndSelect('teamInvitations.team', 'team')
      .where('teamInvitations.teamId = :teamId', { teamId })
      .andWhere('teamInvitations.id = :id', { id })
      .getOne();

    if (!invitation)
      throw new NotFoundException(`Invitation with id ${id} not found`);

    // check if the invitations has been accepted or declined
    if (invitation.status !== 'pending')
      throw new NotAcceptableException(
        'Invitation has already been responded to',
      );

    if (
      invitation.member?.permissions &&
      invitation.member?.permissions.length
    ) {
      // remove the permissions of the user
      await this._entityManager.remove(
        Permission,
        invitation.member?.permissions,
      );
    }

    if (invitation.member) {
      // remove the member data
      await this._entityManager.remove(TeamMember, invitation.member);
    }

    // delete the invitation
    await this._repo.remove(invitation);

    // return true if the invitation was deleted successfully
    return true;
  }

  async generateTeamInvitationToken(): Promise<string> {
    const token = generateRandomString(100);
    // check if there's already a user with the token
    if (await this.findOneByToken(token)) {
      return this.generateTeamInvitationToken();
    }

    return token;
  }
}
