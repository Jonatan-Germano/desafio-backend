import { Module } from '@nestjs/common';
import { WagerTransactionsController } from './wager-transactions.controller';
import { ProcessWagerTransactionService } from './process-wager-transaction.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WalletEntity } from '../../infrastructure/persistence/entities/wallet.entity';
import { WagerTransactionEntity } from '../../infrastructure/persistence/entities/wager-transaction.entity';
import { WalletLedgerEntryEntity } from '../../infrastructure/persistence/entities/wallet-ledger-entry.entity';
import { OutboxMessageEntity } from '../../infrastructure/persistence/entities/outbox-message.entity';
@Module({
  imports: [
    MikroOrmModule.forFeature([
      WalletEntity,
      WagerTransactionEntity,
      WalletLedgerEntryEntity,
      OutboxMessageEntity,
    ]),
  ],
  controllers: [WagerTransactionsController],
  providers: [ProcessWagerTransactionService],
  exports: [ProcessWagerTransactionService],
})
export class WagerTransactionsModule {}