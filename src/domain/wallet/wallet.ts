import { Money } from '../money/money';
import {
  CurrencyMismatchError,
  InsufficientBalanceError,
} from './wallet.errors';

export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpenWalletProps {
  id: string;
  playerId: string;
  initialBalance: Money;
}

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static open(props: OpenWalletProps): Wallet {
    if (!props.initialBalance.isZero() &&
        !props.initialBalance.isPositive()) {
      throw new Error('INVALID_INITIAL_BALANCE');
    }

    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      new Date(),
      new Date(),
    );
  }

  static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      state.balance,
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }

  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  debit(money: Money, at = new Date()): void {
  this.assertSameCurrency(money);

  if (!money.isPositive()) {
    throw new Error('INVALID_DEBIT_AMOUNT');
  }

  if (this._balance.isLessThan(money)) {
    throw new InsufficientBalanceError();
  }

  this._balance = this._balance.subtract(money);
  this.incrementVersion(at);
}

  credit(money: Money, at = new Date()): void {
    this.assertSameCurrency(money);

    if (!money.isPositive()) {
      throw new Error('INVALID_CREDIT_AMOUNT');
    }

    this._balance = this._balance.add(money);
    this.incrementVersion(at);
  }

  private incrementVersion(at: Date): void {
    this._version += 1;
    this._updatedAt = at;
  }

  private assertSameCurrency(money: Money): void {
    if (money.currency !== this.currency) {
      throw new CurrencyMismatchError();
    }
  }
}