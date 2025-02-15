import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async seedUser(): Promise<void> {
    const user = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'johndoe@example.com',
      password: await bcrypt.hash('securepassword123', 10), // Hash the password
    };

    try {
      await this.repo.save(user);
      console.log('User seeded successfully');
    } catch (err) {
      console.error('Error seeding user:', err.message);
    }
  }

  async findByEmailWithFullData(email: string): Promise<User> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.events', 'events')
      .leftJoinAndSelect('user.teamMembers', 'teamMembers')
      .leftJoinAndSelect('teamMembers.team', 'team')
      .leftJoinAndSelect('teamMembers.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.repo.findOneBy({ email });
  }

  async findOneByConnectedAccountId(connectedAccountId: string) {
    return this.repo.findOneBy({
      stripeConnectedAccountId: connectedAccountId,
    });
  }

  async findOneBySubscriptionId(subscriptionId: string) {
    return this.repo.findOneBy({ subscriptionId: subscriptionId });
  }

  async findOneByEmailExceptCurrentUser(
    email: string,
    userId: number,
  ): Promise<User> {
    return await this.repo
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .where('user.email = :email', { email: email })
      .getOne();
  }

  async findOneById(id: string): Promise<User> {
    return this.repo.findOneBy({ id });
  }

  async checkUserPasswordToken(verificationToken: number): Promise<User> {
    return this.repo.findOneBy({ passwordResetToken: verificationToken });
  }

  async checkUserPasswordWithTokenAndEmail(
    email: string,
    verificationToken: number,
  ): Promise<User> {
    return this.repo.findOneBy({
      passwordResetToken: verificationToken,
      email: email,
    });
  }

  async checkUserVerificationToken(verificationToken: number): Promise<User> {
    return this.repo.findOneBy({
      emailVerificationToken: verificationToken,
      emailVerifiedAt: null,
    });
  }

  async checkUserMagicSignInToken(magicSignInToken: number): Promise<User> {
    return this.repo.findOneBy({
      magicSignInToken,
    });
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOne(id: string) {
    return await this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.publicProfile', 'publicProfile')
      .leftJoinAndSelect('user.teams', 'teams')
      .where('user.id = :id', { id: id })
      .getOne();
  }

  async findOneByIdAndUpdate(
    id: string,
    userData: Partial<User>,
  ): Promise<User> {
    const entityToUpdate = await this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.publicProfile', 'publicProfile')
      .leftJoinAndSelect('user.teams', 'teams')
      .where('user.id = :id', { id })
      .getOne();

    if (!entityToUpdate) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(entityToUpdate, userData);
    return await this.repo.save(entityToUpdate);
  }

  async getUserPermissions(userId: string) {
    const user = await this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.teamMembers', 'teamMembers')
      .leftJoinAndSelect('teamMembers.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // const permissions = user.teamMembers.flatMap((teamMember) =>
    //   teamMember.role.permissions.map((permission) => permission.name),
    // );

    // return [...new Set(permissions)];
  }

  async getUserLocation(ip: string) {
    if (!ip) throw new BadRequestException('Invalid IP address');
    const url = `http://ip-api.com/json/${ip}?fields=country,regionName,city,lat,lon,query&key=${process.env.IP_INFO_TOKEN}`;

    try {
      const response = await axios.get(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'axios/0.21.1',
        },
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        throw new BadRequestException(
          `Request limit exceeded. Please try again later`,
        );
      }
      throw new BadRequestException(
        `Failed to get location data for IP: ${ip}`,
      );
    }
  }
}
