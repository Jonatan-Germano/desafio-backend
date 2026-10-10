import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  Index,
} from '@mikro-orm/decorators/legacy';

import {
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../domain/wagering/wager-transaction.enums';

@Entity({ tableName: 'wager_transactions' })
@Unique({
  name: 'uq_wager_provider_external',
  properties: ['providerId', 'externalTransactionId'],
})
@Unique({
  name: 'uq_wager_provider_idempotency',
  properties: ['providerId', 'idempotencyKey'],
})
@Index({
  name: 'idx_wager_pending_reference',
  properties: ['status', 'createdAt'],
})
export class WagerTransactionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string' })
  providerId!: string;

  @Property({ type: 'string' })
  externalTransactionId!: string;

  @Property({ type: 'string' })
  idempotencyKey!: string;

  @Property({ type: 'string', length: 64 })
  payloadHash!: string;

  @Property({ type: 'uuid' })
  walletId!: string;

  @Property({ type: 'uuid' })
  playerId!: string;

  @Property({ type: 'string' })
  roundId!: string;

  @Property({ type: 'string' })
  gameId!: string;

  @Property({ type: 'string', length: 16 })
  kind!: WagerTransactionKind;

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  amount!: string;

  @Property({ type: 'string',length: 3 })
  currency!: string;

  @Property({ type: 'string', nullable: true })
  referenceExternalTransactionId?: string;

  @Property({ type: 'uuid', nullable: true })
  referenceTransactionId?: string;

  @Property({ length: 32 })
  status: WagerTransactionStatus =
    WagerTransactionStatus.Pending;

  @Property({ type: 'string', nullable: true })
  failureCode?: string;

  @Property({ type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt = new Date();

  @Property({
  type: 'numeric',
  precision: 20,
  scale: 2,
  nullable: true,
  })
  resultingBalance?: string;
}