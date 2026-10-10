import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';

import { WalletMapper } from './wallet.mapper';
import { WalletEntity } from '../entities/wallet.entity';
import { Money } from '../../../domain/money/money';
import { Wallet } from '../../../domain/wallet/wallet';

describe('WalletMapper', () => {
  function makeWalletEntity(
    overrides: Record<string, any> = {},
  ): WalletEntity {
    return Object.assign(new WalletEntity(), {
      id: 'wallet-1',
      player: { id: 'player-1' },
      currency: 'BRL',
      balance: '150.75',
      version: 3,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-02T10:00:00.000Z'),
      ...overrides,
    });
  }

  describe('toDomain', () => {
    it('should convert a WalletEntity into a Wallet domain object', () => {
    const entity = makeWalletEntity();

    const wallet = WalletMapper.toDomain(entity);

    assert.ok(wallet instanceof Wallet);
    assert.equal(wallet.id, 'wallet-1');
    assert.equal(wallet.playerId, 'player-1');
    assert.equal(wallet.currency, 'BRL');
    assert.equal(wallet.balance.toString(), '150.75');
    assert.equal(wallet.version, 3);
  });

    

    it('should preserve the creation and update dates', () => {
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      const updatedAt = new Date('2026-01-02T10:00:00.000Z');

      const entity = makeWalletEntity({
        createdAt,
        updatedAt,
      });

      const wallet = WalletMapper.toDomain(entity);

      assert.equal(wallet.createdAt, createdAt);
      assert.equal(wallet.updatedAt, updatedAt);
    });

    it('should convert a zero balance correctly', () => {
      const entity = makeWalletEntity({
        balance: '0.00',
      });

      const wallet = WalletMapper.toDomain(entity);

      assert.equal(wallet.balance.isZero(), true);
      assert.deepEqual(wallet.balance.toJSON(), {
        amount: '0.00',
        currency: 'BRL',
      });
    });

    it('should preserve the currency in the Money object', () => {
      const entity = makeWalletEntity({
        currency: 'USD',
        balance: '99.99',
      });

      const wallet = WalletMapper.toDomain(entity);

      assert.equal(wallet.currency, 'USD');
      assert.equal(wallet.balance.currency, 'USD');
      assert.equal(wallet.balance.toString(), '99.99');
    });

    it('should preserve the cent precision of the balance', () => {
      const entity = makeWalletEntity({
        balance: '0.01',
      });

      const wallet = WalletMapper.toDomain(entity);

      assert.equal(wallet.balance.equals(
        Money.from({
          amount: '0.01',
          currency: 'BRL',
        }),
      ), true);
    });

    it('should reject an invalid monetary amount', () => {
      const entity = makeWalletEntity({
        balance: 'invalid',
      });

      assert.throws(
        () => WalletMapper.toDomain(entity),
        /INVALID_MONEY_AMOUNT/,
      );
    });

    it('should reject a currency with an invalid format', () => {
      const entity = makeWalletEntity({
        currency: 'brl',
      });

      assert.throws(
        () => WalletMapper.toDomain(entity),
        /INVALID_CURRENCY/,
      );
    });
  
  });
  
});