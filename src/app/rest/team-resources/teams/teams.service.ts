import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { EntityManager, Repository } from 'typeorm';
import { TeamMember } from '../team-members/entities/team-member.entity';
import { UsersService } from '@app/rest/users/users.service';
import { Team } from '@app/rest/team-resources/teams/entities/team.entity';
import { generateRandomString } from '@libs/helpers/char-generator';
import { TeamInvitation } from '@app/rest/team-resources/team-invitations/entities/team-invitation.entity';
import { TeamInvitationsService } from '@app/rest/team-resources/team-invitations/team-invitations.service';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly repo: Repository<Team>,
    private readonly entityManager: EntityManager,
    private readonly usersService: UsersService,
    private readonly teamInvitationsService: TeamInvitationsService,
  ) {}

  async create(createTeamDto: CreateTeamDto, userId: string) {
    // fetch the current user data
    const user = await this.usersService.findOneById(userId);
    const { name, color, members } = createTeamDto;

    const team = await this.entityManager.transaction(async (manager) => {
      const team = manager.create(Team, {
        name,
        color,
      });

      // save the team to the database
      const savedTeam = await manager.save<Team>(team);

      // create the team member with the user
      const teamMember = manager.create(TeamMember, {
        team: savedTeam,
        user,
        isAdmin: true,
      });
      // save the team member data to database
      await manager.save<TeamMember>(teamMember);

      // Create members invitations for members
      if (members && members.length) {
        for (const memberEmail of members) {
          // check if the user exists
          const memberUser =
            await this.usersService.findOneByEmail(memberEmail);

          //generate invitation token
          const token = await this.generateTeamInvitationToken();

          const invitation = manager.create(TeamInvitation, {
            team: savedTeam,
            user: memberUser,
            token,
            email: memberEmail,
          });
          // save the invitation(notification to be worked on later)
          await manager.save<TeamInvitation>(invitation);
        }
      }
      // return the saved team data
      return savedTeam;
    });

    return this.findOne(team.id, true);
  }

  findAll(userId: number, req: Request) {
    return this.repo.createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .where('members.userId = :userId', { userId })
  }

  async findOne(id: string, throwException: boolean = false) {
    const team = await this.repo
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('team.id = :id', { id })
      .getOne();

    // check if the team exists
    if (!team && throwException) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    // return the found team data
    return team;
  }

  update(id: number, updateTeamDto: UpdateTeamDto) {
    return `This action updates a #${id} team`;
  }

  remove(id: number) {
    return `This action removes a #${id} team`;
  }

  async generateTeamInvitationToken(): Promise<string> {
    const token = generateRandomString(100);
    // check if there's already a user with the token
    if (await this.teamInvitationsService.findOneByToken(token)) {
      return this.generateTeamInvitationToken();
    }

    return token;
  }
}
