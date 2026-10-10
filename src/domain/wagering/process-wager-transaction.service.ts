import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import {
  EntityManager,
  LockMode,
} from '@mikro-orm/core';

import { SubmitTransactionDto } from '../../domain/wagering/dto/submit-transaction.dto';
import { calculatePayloadHash } from '../../domain/wagering/utils/payload-hash';
import { Money } from '../../domain/money/money';
import { Wallet } from '../../domain/wallet/wallet';

import {
  LedgerDirection,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../domain/wagering/wager-transaction.enums';

import { WagerTransaction } from '../../domain/wagering/wager-transaction';
import { WalletEntity } from '../../infrastructure/persistence/entities/wallet.entity';
import { WagerTransactionEntity } from '../../infrastructure/persistence/entities/wager-transaction.entity';
import { WalletLedgerEntryEntity } from '../../infrastructure/persistence/entities/wallet-ledger-entry.entity';
import { OutboxMessageEntity } from '../../infrastructure/persistence/entities/outbox-message.entity';
import { WalletMapper } from '../../infrastructure/persistence/mappers/wallet.mapper';

@Injectable()
export class ProcessWagerTransactionService {
  constructor(
    private readonly em: EntityManager,
  ) {}

  async execute(
    dto: SubmitTransactionDto,
    idempotencyKey: string,
  ) {
    const payloadHash = calculatePayloadHash(dto);

    return this.em.transactional(async (em) => {
      const existing = await em.findOne(
        WagerTransactionEntity,
        {
          providerId: dto.providerId,
          idempotencyKey,
        },
      );

      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw new ConflictException(
            'IDEMPOTENCY_PAYLOAD_CONFLICT',
          );
        }

        return {
          transactionId: existing.id,
          status: existing.status,
          balance: existing.resultingBalance ?? null,
          currency: existing.currency,
          replay: true,
        };
      }

      const externalExisting = await em.findOne(
        WagerTransactionEntity,
        {
          providerId: dto.providerId,
          externalTransactionId: dto.externalTransactionId,
        },
      );

      if (externalExisting) {
        throw new ConflictException(
          'EXTERNAL_TRANSACTION_ID_CONFLICT',
        );
      }

      if (dto.kind === WagerTransactionKind.Opening) {
        throw new ConflictException('OPENING_IS_INTERNAL');
      }

      const walletEntity = await em.findOne(
        WalletEntity,
        { id: dto.walletId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      if (!walletEntity) {
        throw new NotFoundException('WALLET_NOT_FOUND');
      }

      if (walletEntity.player.id !== dto.playerId) {
        throw new ConflictException('PLAYER_MISMATCH');
      }

      if (walletEntity.currency !== dto.money.currency) {
        throw new ConflictException('CURRENCY_MISMATCH');
      }

      const wallet: Wallet = WalletMapper.toDomain(
        walletEntity,
      );

      const money = Money.from({
        amount: dto.money.amount,
        currency: dto.money.currency,
      });

      let reference: WagerTransactionEntity | undefined;

        if (dto.kind === WagerTransactionKind.Rollback) {
        reference = await this.findBetForRollback(em, dto);
        } else if (dto.kind === WagerTransactionKind.Refund) {
        reference = await this.findBetForRefund(em, dto);
        }

      const now = new Date();

      const direction = this.applyBalanceMovement(
        wallet,
        dto,
        reference,
        money,
        now,
      );

      walletEntity.balance = wallet.balance.toJSON().amount;
      walletEntity.version = wallet.version;
      walletEntity.updatedAt = wallet.updatedAt;

      const transaction = WagerTransaction.create({
        id: randomUUID(),
        providerId: dto.providerId,
        externalTransactionId: dto.externalTransactionId,
        idempotencyKey,
        payloadHash,
        walletId: dto.walletId,
        playerId: dto.playerId,
        roundId: dto.roundId,
        gameId: dto.gameId,
        kind: dto.kind,
        money,
        referenceExternalTransactionId:
          dto.referenceExternalTransactionId,
      });

      transaction.markProcessed(reference?.id, now);

      const transactionEntity = new WagerTransactionEntity();

      transactionEntity.id = transaction.id;
      transactionEntity.providerId = transaction.providerId;
      transactionEntity.externalTransactionId =
        transaction.externalTransactionId;
      transactionEntity.idempotencyKey =
        transaction.idempotencyKey;
      transactionEntity.payloadHash = transaction.payloadHash;
      transactionEntity.walletId = transaction.walletId;
      transactionEntity.playerId = transaction.playerId;
      transactionEntity.roundId = transaction.roundId;
      transactionEntity.gameId = transaction.gameId;
      transactionEntity.kind = transaction.kind;
      transactionEntity.amount = transaction.money.toJSON().amount;
      transactionEntity.currency = transaction.money.currency;
      transactionEntity.status = transaction.status;
      transactionEntity.createdAt = transaction.createdAt;
      transactionEntity.processedAt = now;
      transactionEntity.referenceExternalTransactionId =
        transaction.referenceExternalTransactionId;
      transactionEntity.referenceTransactionId =
        reference?.id;
      transactionEntity.resultingBalance =
        wallet.balance.toJSON().amount;

      const entities: object[] = [
        walletEntity,
        transactionEntity,
      ];

      if (direction) {
        const ledger = new WalletLedgerEntryEntity();

        ledger.id = randomUUID();
        ledger.walletId = dto.walletId;
        ledger.transactionId = transactionEntity.id;
        ledger.direction = direction;
        ledger.amount = money.toJSON().amount;
        ledger.currency = money.currency;
        ledger.balanceBefore = direction === LedgerDirection.Debit
          ? wallet.balance.add(money).toJSON().amount
          : wallet.balance.subtract(money).toJSON().amount;
        ledger.balanceAfter = wallet.balance.toJSON().amount;
        ledger.createdAt = now;

        entities.push(ledger);
      }

      const outbox = new OutboxMessageEntity();

      outbox.id = randomUUID();
      outbox.aggregateId = walletEntity.id;
      outbox.eventType = 'WAGER_TRANSACTION_PROCESSED';
      outbox.payload = {
        transactionId: transactionEntity.id,
        providerId: dto.providerId,
        externalTransactionId: dto.externalTransactionId,
        walletId: dto.walletId,
        playerId: dto.playerId,
        kind: dto.kind,
        status: transactionEntity.status,
        amount: money.toJSON().amount,
        currency: money.currency,
        balance: wallet.balance.toJSON().amount,
      };
      outbox.occurredAt = now;
      outbox.attempts = 0;

      entities.push(outbox);

      em.persist(entities);
      await em.flush();

      return {
        transactionId: transactionEntity.id,
        status: transactionEntity.status,
        balance: transactionEntity.resultingBalance,
        currency: transactionEntity.currency,
        replay: false,
      };
    }, { clear: true });
  }

  private async findBetForRollback(
    em: EntityManager,
    dto: SubmitTransactionDto,
  ): Promise<WagerTransactionEntity> {
    const externalId = dto.referenceExternalTransactionId;

    if (!externalId) {
      throw new ConflictException('REFERENCE_REQUIRED');
    }

    const reference = await em.findOne(
      WagerTransactionEntity,
      {
        providerId: dto.providerId,
        externalTransactionId: externalId,
      },
      {
        lockMode: LockMode.PESSIMISTIC_WRITE,
      },
    );

    if (!reference) {
      throw new NotFoundException('REFERENCE_NOT_FOUND');
    }

    if (
      reference.kind !== WagerTransactionKind.Bet ||
      reference.status !== WagerTransactionStatus.Processed
    ) {
      throw new ConflictException('REFERENCE_INVALID');
    }

    if (
      reference.walletId !== dto.walletId ||
      reference.playerId !== dto.playerId
    ) {
      throw new ConflictException('REFERENCE_INVALID');
    }

    if (reference.roundId !== dto.roundId) {
      throw new ConflictException('ROUND_MISMATCH');
    }

    if (
      reference.amount !== dto.money.amount ||
      reference.currency !== dto.money.currency
    ) {
      throw new ConflictException('AMOUNT_MISMATCH');
    }

    return reference;
  }

  private applyBalanceMovement(
    wallet: Wallet,
    dto: SubmitTransactionDto,
    reference: WagerTransactionEntity | undefined,
    money: Money,
    at: Date,
  ): LedgerDirection | undefined {
    switch (dto.kind) {
      case WagerTransactionKind.Bet:
        wallet.debit(money, at);
        return LedgerDirection.Debit;

      case WagerTransactionKind.Win:
        wallet.credit(money, at);
        return LedgerDirection.Credit;

      case WagerTransactionKind.Loss:
        return undefined;

      case WagerTransactionKind.Rollback:
        if (!reference) {
          throw new ConflictException('REFERENCE_REQUIRED');
        }

        wallet.credit(
          Money.from({
            amount: reference.amount,
            currency: reference.currency,
          }),
          at,
        );

        return LedgerDirection.Credit;

      default:
        throw new ConflictException('INVALID_TRANSACTION_KIND');

    case WagerTransactionKind.Refund:
        if (!reference) {
            throw new ConflictException('REFERENCE_REQUIRED');
        }

        wallet.credit(
            Money.from({
            amount: reference.amount,
            currency: reference.currency,
            }),
            at,
        );

        return LedgerDirection.Credit;
    }
  }

    private async findBetForRefund(
    em: EntityManager,
    dto: SubmitTransactionDto,
    ): Promise<WagerTransactionEntity> {
    const externalId = dto.referenceExternalTransactionId;

    if (!externalId) {
        throw new ConflictException('REFERENCE_REQUIRED');
    }

    const reference = await em.findOne(
        WagerTransactionEntity,
        {
        providerId: dto.providerId,
        externalTransactionId: externalId,
        },
        {
        lockMode: LockMode.PESSIMISTIC_WRITE,
        },
    );

    if (!reference) {
        throw new NotFoundException('REFERENCE_NOT_FOUND');
    }

    if (
        reference.kind !== WagerTransactionKind.Bet ||
        reference.status !== WagerTransactionStatus.Processed
    ) {
        throw new ConflictException('REFERENCE_INVALID');
    }

    if (
        reference.walletId !== dto.walletId ||
        reference.playerId !== dto.playerId
    ) {
        throw new ConflictException('REFERENCE_INVALID');
    }

    if (reference.roundId !== dto.roundId) {
        throw new ConflictException('ROUND_MISMATCH');
    }

    if (
        reference.amount !== dto.money.amount ||
        reference.currency !== dto.money.currency
    ) {
        throw new ConflictException('AMOUNT_MISMATCH');
    }

    return reference;
    }
}