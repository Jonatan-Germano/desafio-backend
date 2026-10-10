import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'users' })
export class UserEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', length: 255 })
  @Unique({ name: 'uq_users_email' })
  email!: string;

  @Property({ type: 'string', length: 100, nullable: true })
  name?: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt = new Date();

  @Property({
    type: 'timestamptz',
    defaultRaw: 'now()',
    onUpdate: () => new Date(),
  })
  updatedAt = new Date();
}