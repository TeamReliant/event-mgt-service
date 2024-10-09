import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

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

  async findOneByConnectedAccountId(connectedAccountId: string)
  {
    return this.repo.findOneBy({ stripeConnectedAccountId: connectedAccountId });
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
      .where('user.id = :id', { id: id })
      .getOne();
  }

  async findOneByIdAndUpdate(
    id: string,
    userData: Partial<User>,
  ): Promise<User> {
    // Step 1: Retrieve the entity
    const entityToUpdate = await this.repo.findOneBy({ id });

    // Check if the entity exists
    if (!entityToUpdate)
      throw new NotFoundException(`User with ID ${id} not found`);

    // Step 2: Modify the entity with new data
    Object.assign(entityToUpdate, userData);

    // Step 3: Save the updated entity
    return await this.repo.save(entityToUpdate);
  }
}
