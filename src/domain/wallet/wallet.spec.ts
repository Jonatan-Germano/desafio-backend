import { beforeEach, describe, expect, it } from '@jest/globals';

import { Wallet } from './wallet';
import { Money } from '../money/money';
import {
  CurrencyMismatchError,
  InsufficientBalanceError,
} from './wallet.errors';

describe('Wallet', () => {
  const money = (amount: string, currency = 'BRL') =>
    Money.from({ amount, currency });

  let wallet: Wallet;

  beforeEach(() => {
    wallet = Wallet.open({
      id: 'wallet-1',
      playerId: 'player-1',
      initialBalance: money('100.00'),
    });
  });

  describe('open', () => {
    it('should open a wallet with the initial balance', () => {
      expect(wallet.id).toBe('wallet-1');
      expect(wallet.playerId).toBe('player-1');
      expect(wallet.currency).toBe('BRL');
      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should open a wallet with zero balance', () => {
      const emptyWallet = Wallet.open({
        id: 'wallet-2',
        playerId: 'player-1',
        initialBalance: Money.zero('BRL'),
      });

      expect(emptyWallet.balance.isZero()).toBe(true);
      expect(emptyWallet.version).toBe(1);
    });

    it('should reject a negative initial balance', () => {
      expect(() =>
        Wallet.open({
          id: 'wallet-3',
          playerId: 'player-1',
          initialBalance: money('10.00').negate(),
        }),
      ).toThrow('INVALID_INITIAL_BALANCE');
    });

    it('should initialize createdAt and updatedAt', () => {
      const before = Date.now();

      const newWallet = Wallet.open({
        id: 'wallet-4',
        playerId: 'player-1',
        initialBalance: money('50.00'),
      });

      const after = Date.now();

      expect(newWallet.createdAt).toBeInstanceOf(Date);
      expect(newWallet.updatedAt).toBeInstanceOf(Date);

      expect(newWallet.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(newWallet.createdAt.getTime()).toBeLessThanOrEqual(after);

      expect(newWallet.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(newWallet.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('rehydrate', () => {
    it('should restore a wallet from persisted state', () => {
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      const updatedAt = new Date('2026-01-02T10:00:00.000Z');

      const restored = Wallet.rehydrate({
        id: 'wallet-restored',
        playerId: 'player-2',
        currency: 'BRL',
        balance: money('250.00'),
        version: 7,
        createdAt,
        updatedAt,
      });

      expect(restored.id).toBe('wallet-restored');
      expect(restored.playerId).toBe('player-2');
      expect(restored.currency).toBe('BRL');
      expect(restored.balance.toString()).toBe('250.00');
      expect(restored.version).toBe(7);
      expect(restored.createdAt).toBe(createdAt);
      expect(restored.updatedAt).toBe(updatedAt);
    });
  });

  describe('debit', () => {
    it('should debit the balance', () => {
      wallet.debit(money('30.00'));

      expect(wallet.balance.toString()).toBe('70.00');
    });

    it('should increment the version after a debit', () => {
      wallet.debit(money('30.00'));

      expect(wallet.version).toBe(2);
    });

    it('should update updatedAt with the supplied date', () => {
      const at = new Date('2026-02-01T12:00:00.000Z');

      wallet.debit(money('10.00'), at);

      expect(wallet.updatedAt).toBe(at);
    });

    it('should allow debiting the exact available balance', () => {
      wallet.debit(money('100.00'));

      expect(wallet.balance.isZero()).toBe(true);
    });

    it('should reject a debit greater than the available balance', () => {
      expect(() => wallet.debit(money('100.01'))).toThrow(
        InsufficientBalanceError,
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should reject a zero debit', () => {
      expect(() => wallet.debit(Money.zero('BRL'))).toThrow(
        'INVALID_DEBIT_AMOUNT',
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should reject a negative debit', () => {
      expect(() => wallet.debit(money('10.00').negate())).toThrow(
        'INVALID_DEBIT_AMOUNT',
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should reject a debit in a different currency', () => {
      expect(() => wallet.debit(money('10.00', 'USD'))).toThrow(
        CurrencyMismatchError,
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });
  });

  describe('credit', () => {
    it('should credit the balance', () => {
      wallet.credit(money('50.00'));

      expect(wallet.balance.toString()).toBe('150.00');
    });

    it('should increment the version after a credit', () => {
      wallet.credit(money('50.00'));

      expect(wallet.version).toBe(2);
    });

    it('should update updatedAt with the supplied date', () => {
      const at = new Date('2026-03-01T12:00:00.000Z');

      wallet.credit(money('10.00'), at);

      expect(wallet.updatedAt).toBe(at);
    });

    it('should reject a zero credit', () => {
      expect(() => wallet.credit(Money.zero('BRL'))).toThrow(
        'INVALID_CREDIT_AMOUNT',
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should reject a negative credit', () => {
      expect(() => wallet.credit(money('10.00').negate())).toThrow(
        'INVALID_CREDIT_AMOUNT',
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });

    it('should reject a credit in a different currency', () => {
      expect(() => wallet.credit(money('10.00', 'USD'))).toThrow(
        CurrencyMismatchError,
      );

      expect(wallet.balance.toString()).toBe('100.00');
      expect(wallet.version).toBe(1);
    });
  });

  describe('multiple operations', () => {
    it('should maintain balance and version across operations', () => {
      wallet.credit(money('50.00'));
      wallet.debit(money('20.00'));
      wallet.credit(money('10.00'));

      expect(wallet.balance.toString()).toBe('140.00');
      expect(wallet.version).toBe(4);
    });

    it('should not change updatedAt when a debit fails', () => {
      const originalUpdatedAt = wallet.updatedAt;
      const originalVersion = wallet.version;

      expect(() => wallet.debit(money('200.00'))).toThrow(
        InsufficientBalanceError,
      );

      expect(wallet.updatedAt).toBe(originalUpdatedAt);
      expect(wallet.version).toBe(originalVersion);
    });
  });
});