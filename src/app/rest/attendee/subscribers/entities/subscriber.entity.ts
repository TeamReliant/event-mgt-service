import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '@libs/database';

@Entity({ name: 'subscribers' })
export class Subscriber extends AbstractEntity<Subscriber> {
  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'subscribed', type: 'boolean', default: true })
  subscribed: boolean;
}
