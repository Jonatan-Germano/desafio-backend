import { WalletLedgerEntry } from './wallet-ledger-entry';
import { Money } from '../money/money';
import { LedgerDirection } from '../wagering/wager-transaction.enums';

describe('WalletLedgerEntry', () => {
  const money = (amount: string, currency = 'BRL') =>
    Money.from({ amount, currency });

  const baseProps = {
    id: 'ledger-1',
    walletId: 'wallet-1',
    transactionId: 'transaction-1',
    direction: LedgerDirection.Credit,
    money: money('100.00'),
    balanceBefore: money('50.00'),
    balanceAfter: money('150.00'),
  };

  describe('create', () => {
    it('should create a valid credit entry', () => {
      const entry = WalletLedgerEntry.create(baseProps);

      expect(entry).toBeInstanceOf(WalletLedgerEntry);
      expect(entry.id).toBe('ledger-1');
      expect(entry.money.toString()).toBe('100.00');
      expect(entry.isBalanced()).toBe(true);
    });

    it('should create a valid debit entry', () => {
      const entry = WalletLedgerEntry.create({
        ...baseProps,
        direction: LedgerDirection.Debit,
        money: money('30.00'),
        balanceBefore: money('100.00'),
        balanceAfter: money('70.00'),
      });

      expect(entry.direction).toBe(LedgerDirection.Debit);
      expect(entry.isBalanced()).toBe(true);
    });

    it('should set createdAt automatically', () => {
      const before = Date.now();

      const entry = WalletLedgerEntry.create(baseProps);

      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should preserve the provided createdAt', () => {
      const createdAt = new Date('2026-01-15T10:00:00.000Z');

      const entry = WalletLedgerEntry.create({
        ...baseProps,
        createdAt,
      });

      expect(entry.createdAt).toBe(createdAt);
    });

    it('should reject a zero amount', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          money: Money.zero('BRL'),
          balanceBefore: money('50.00'),
          balanceAfter: money('50.00'),
        }),
      ).toThrow('INVALID_LEDGER_AMOUNT');
    });

    it('should reject a negative amount', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          money: money('10.00').negate(),
          balanceBefore: money('50.00'),
          balanceAfter: money('40.00'),
        }),
      ).toThrow('INVALID_LEDGER_AMOUNT');
    });

    it('should reject a negative balanceBefore', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          balanceBefore: money('10.00').negate(),
          balanceAfter: money('90.00'),
        }),
      ).toThrow('NEGATIVE_LEDGER_BALANCE');
    });

    it('should reject a negative balanceAfter', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          direction: LedgerDirection.Debit,
          money: money('100.00'),
          balanceBefore: money('50.00'),
          balanceAfter: money('50.00').subtract(money('100.00')),
        }),
      ).toThrow('NEGATIVE_LEDGER_BALANCE');
    });

    it('should reject an unbalanced credit entry', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          balanceAfter: money('140.00'),
        }),
      ).toThrow('UNBALANCED_LEDGER_ENTRY');
    });

    it('should reject an unbalanced debit entry', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          direction: LedgerDirection.Debit,
          money: money('30.00'),
          balanceBefore: money('100.00'),
          balanceAfter: money('80.00'),
        }),
      ).toThrow('UNBALANCED_LEDGER_ENTRY');
    });

    it('should reject different currencies', () => {
      expect(() =>
        WalletLedgerEntry.create({
          ...baseProps,
          balanceAfter: money('150.00', 'USD'),
        }),
      ).toThrow('UNBALANCED_LEDGER_ENTRY');
    });
  });

  describe('isBalanced', () => {
    it('should return true for a balanced credit', () => {
      const entry = WalletLedgerEntry.create(baseProps);

      expect(entry.isBalanced()).toBe(true);
    });

    it('should return true for a balanced debit', () => {
      const entry = WalletLedgerEntry.create({
        ...baseProps,
        direction: LedgerDirection.Debit,
        money: money('25.00'),
        balanceBefore: money('100.00'),
        balanceAfter: money('75.00'),
      });

      expect(entry.isBalanced()).toBe(true);
    });

    it('should return false for different currencies after rehydration', () => {
      const entry = WalletLedgerEntry.rehydrate({
        ...baseProps,
        balanceAfter: money('150.00', 'USD'),
        createdAt: new Date(),
      });

      expect(entry.isBalanced()).toBe(false);
    });
  });

  describe('rehydrate', () => {
    it('should restore the persisted state without changing its values', () => {
      const createdAt = new Date('2026-01-15T10:00:00.000Z');

      const entry = WalletLedgerEntry.rehydrate({
        ...baseProps,
        createdAt,
      });

      expect(entry.id).toBe(baseProps.id);
      expect(entry.walletId).toBe(baseProps.walletId);
      expect(entry.transactionId).toBe(baseProps.transactionId);
      expect(entry.money).toBe(baseProps.money);
      expect(entry.createdAt).toBe(createdAt);
    });

    it('should allow rehydrating an unbalanced entry', () => {
      const entry = WalletLedgerEntry.rehydrate({
        ...baseProps,
        balanceAfter: money('999.00'),
        createdAt: new Date(),
      });

      expect(entry.isBalanced()).toBe(false);
    });
  });
});