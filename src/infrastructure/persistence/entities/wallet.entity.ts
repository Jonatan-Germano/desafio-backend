import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  ManyToOne,
} from '@mikro-orm/decorators/legacy';

import { UserEntity } from './user/user.entity';

@Entity({ tableName: 'wallets' })
@Unique({
  name: 'uq_wallet_player_currency',
  properties: ['player', 'currency'],
})
export class WalletEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => UserEntity, {
    fieldName: 'player_id',
    deleteRule: 'restrict',
  })
  player!: UserEntity;

  @Property({ type: 'string', length: 3 })
  currency!: string;

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  balance!: string;

  @Property({ type: 'integer', default: 1 })
  version = 1;

  @Property({
    type: 'timestamptz',
    defaultRaw: 'now()',
  })
  createdAt = new Date();

  @Property({
    type: 'timestamptz',
    defaultRaw: 'now()',
    onUpdate: () => new Date(),
  })
  updatedAt = new Date();
}