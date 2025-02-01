import { Column, Entity, OneToOne } from 'typeorm';
import { User } from '@app/rest/users/entities/user.entity';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'users_public_profiles' })
export class UsersPublicProfile extends AbstractEntity<UsersPublicProfile> {
  @Column({
    name: 'company_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  companyName?: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  phoneNumber?: string;

  @Column({ name: 'country', type: 'varchar', length: 255, nullable: true })
  country?: string;

  @Column({ name: 'state', type: 'varchar', length: 255, nullable: true })
  state?: string;

  @Column({ name: 'city', type: 'varchar', length: 255, nullable: true })
  city?: string;

  @Column({ name: 'zip', type: 'varchar', length: 255, nullable: true })
  zip?: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ name: 'website', type: 'varchar', length: 1000, nullable: true })
  website?: string;

  @Column({
    name: 'visibility',
    type: 'varchar',
    default: true,
  })
  visibility?: string;

  @Column({ name: 'logo', type: 'text', nullable: true })
  logo?: string;

  @OneToOne(() => User, (user) => user.publicProfile)
  user: User;
}
