import {
  Entity,
  PrimaryKey,
  Property,
  Unique,
  Index,
} from '@mikro-orm/decorators/legacy';

import { LedgerDirection } from '../../../domain/wagering/wager-transaction.enums';

@Entity({ tableName: 'wallet_ledger_entries' })
@Unique({
  name: 'uq_ledger_transaction',
  properties: ['transactionId'],
})
@Index({
  name: 'idx_ledger_wallet_created_id',
  properties: ['walletId', 'createdAt', 'id'],
})
export class WalletLedgerEntryEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  walletId!: string;

  @Property({ type: 'uuid' })
  transactionId!: string;

  @Property({ type: 'string', length: 6 })
  direction!: LedgerDirection;

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  amount!: string;

  @Property({ type:'string', length: 3 })
  currency!: string;

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  balanceBefore!: string;

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  balanceAfter!: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt = new Date();
}