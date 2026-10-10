import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { ProcessWagerTransactionService } from './process-wager-transaction.service';

import { SubmitTransactionDto } from '../../domain/wagering/dto/submit-transaction.dto';

import {
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../domain/wagering/wager-transaction.enums';

import { WagerTransactionEntity } from '../../infrastructure/persistence/entities/wager-transaction.entity';
import { WalletEntity } from '../../infrastructure/persistence/entities/wallet.entity';
import { WalletMapper } from '../../infrastructure/persistence/mappers/wallet.mapper';
import { Wallet } from '../../domain/wallet/wallet';
import { Money } from '../../domain/money/money';
import { calculatePayloadHash } from '../../domain/wagering/utils/payload-hash';

describe('ProcessWagerTransactionService', () => {
  let service: ProcessWagerTransactionService;
  let em: any;
  let findResults: any[];
  let walletMapperSpy: ReturnType<typeof jest.spyOn>;

  const idempotencyKey = 'idempotency-123';

  const dto = {
    providerId: 'provider-1',
    externalTransactionId: 'external-123',
    walletId: 'wallet-1',
    playerId: 'player-1',
    roundId: 'round-1',
    gameId: 'game-1',
    kind: WagerTransactionKind.Bet,
    money: {
      amount: '10.00',
      currency: 'BRL',
    },
  } as SubmitTransactionDto;

  function makeWalletEntity() {
    return Object.assign(new WalletEntity(), {
      id: 'wallet-1',
      player: { id: 'player-1' },
      currency: 'BRL',
      balance: '100.00',
      version: 1,
      updatedAt: new Date(),
    });
  }

  function makeExistingTransaction(
    overrides: Record<string, unknown> = {},
  ) {
    return Object.assign(new WagerTransactionEntity(), {
      id: 'transaction-existing',
      providerId: dto.providerId,
      externalTransactionId: dto.externalTransactionId,
      idempotencyKey,
      payloadHash: calculatePayloadHash(dto),
      status: WagerTransactionStatus.Processed,
      resultingBalance: '90.00',
      currency: 'BRL',
      ...overrides,
    });
  }

  beforeEach(() => {
    findResults = [];

    em = {
      findOne: jest.fn(async () => findResults.shift() ?? null),
      persist: jest.fn(() => undefined),
      flush: jest.fn(async () => undefined),
      transactional: jest.fn(async (callback: any) =>
        callback(em),
      ),
    };

    service = new ProcessWagerTransactionService(
      em as EntityManager,
    );

    const fakeWallet = {
      balance: Money.from({
        amount: '100.00',
        currency: 'BRL',
      }),
      version: 1,
      updatedAt: new Date(),

      debit: jest.fn(function (this: any, amount: Money, at: Date) {
        this.balance = this.balance.subtract(amount);
        this.version += 1;
        this.updatedAt = at;
      }),

      credit: jest.fn(function (this: any, amount: Money, at: Date) {
        this.balance = this.balance.add(amount);
        this.version += 1;
        this.updatedAt = at;
      }),
    };

    walletMapperSpy = jest.spyOn(
      WalletMapper,
      'toDomain',
    ).mockReturnValue(fakeWallet as unknown as Wallet);
  });

  describe('idempotency', () => {
    it('should return the existing transaction for the same payload', async () => {
      findResults = [
        makeExistingTransaction(),
      ];

      const result = await service.execute(dto, idempotencyKey);

      expect(result).toEqual({
        transactionId: 'transaction-existing',
        status: WagerTransactionStatus.Processed,
        balance: '90.00',
        currency: 'BRL',
        replay: true,
      });

      expect(em.findOne).toHaveBeenCalledTimes(1);
      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('should throw when the idempotency key is reused with a different payload', async () => {
      findResults = [
        makeExistingTransaction({
          payloadHash: 'different-hash',
        }),
      ];

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow(
        new ConflictException('IDEMPOTENCY_PAYLOAD_CONFLICT'),
      );

      expect(em.persist).not.toHaveBeenCalled();
    });

    it('should return null balance when the existing transaction has no resulting balance', async () => {
      findResults = [
        makeExistingTransaction({
          resultingBalance: null,
        }),
      ];

      const result = await service.execute(dto, idempotencyKey);

      expect(result.balance).toBeNull();
      expect(result.replay).toBe(true);
    });
  });

  describe('transaction validation', () => {
    it('should reject a duplicate external transaction ID', async () => {
      findResults = [
        null,
        makeExistingTransaction({
          idempotencyKey: 'another-key',
          payloadHash: 'another-hash',
        }),
      ];

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow(
        new ConflictException('EXTERNAL_TRANSACTION_ID_CONFLICT'),
      );

      expect(em.persist).not.toHaveBeenCalled();
    });

    it('should reject an opening transaction from an external provider', async () => {
      findResults = [null, null];

      const openingDto = {
        ...dto,
        kind: WagerTransactionKind.Opening,
      } as SubmitTransactionDto;

      await expect(
        service.execute(openingDto, idempotencyKey),
      ).rejects.toThrow(
        new ConflictException('OPENING_IS_INTERNAL'),
      );

      expect(em.findOne).toHaveBeenCalledTimes(2);
      expect(em.persist).not.toHaveBeenCalled();
    });

    it('should throw when the wallet does not exist', async () => {
      findResults = [null, null, null];

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow(
        new NotFoundException('WALLET_NOT_FOUND'),
      );
    });

    it('should reject a wallet belonging to another player', async () => {
      findResults = [
        null,
        null,
        Object.assign(makeWalletEntity(), {
          player: { id: 'another-player' },
        }),
      ];

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow(
        new ConflictException('PLAYER_MISMATCH'),
      );

      expect(em.persist).not.toHaveBeenCalled();
    });

    it('should reject a currency mismatch with the wallet', async () => {
      findResults = [
        null,
        null,
        Object.assign(makeWalletEntity(), {
          currency: 'USD',
        }),
      ];

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow(
        new ConflictException('CURRENCY_MISMATCH'),
      );

      expect(em.persist).not.toHaveBeenCalled();
    });
  });

  describe('persistence failures', () => {
    it('should propagate a flush error', async () => {
      findResults = [null, null, makeWalletEntity()];

      em.flush.mockRejectedValueOnce(
        new Error('DATABASE_ERROR'),
      );

      await expect(
        service.execute(dto, idempotencyKey),
      ).rejects.toThrow('DATABASE_ERROR');
    });
  });
});