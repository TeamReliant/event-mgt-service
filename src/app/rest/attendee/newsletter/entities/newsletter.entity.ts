import { AbstractEntity } from '@libs/database';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'newsletters' })
export class Newsletter extends AbstractEntity<Newsletter> {}
