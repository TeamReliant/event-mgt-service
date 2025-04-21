import { Column, Entity, ManyToOne } from 'typeorm';
import { AbstractEntity } from '@libs/database';
import { User } from '@app/rest/users/entities/user.entity';

@Entity({ name: 'active_users' })
export class ActiveUser extends AbstractEntity<ActiveUser> {
  @ManyToOne(() => User, (user) => user.activities)
  user: User;

  @Column({
    name: 'frequency',
    nullable: true,
  })
  frequency?: number;
}
