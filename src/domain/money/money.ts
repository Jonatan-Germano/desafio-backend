export interface MoneyProps {
  amount: string;
  currency: string;
}

export class Money {
  private constructor(
    private readonly cents: bigint,
    public readonly currency: string,
  ) {}

  static from(props: MoneyProps): Money {
    const { amount, currency } = props;

    if (!/^(0|[1-9]\d*)\.\d{2}$/.test(amount)) {
      throw new Error('INVALID_MONEY_AMOUNT');
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error('INVALID_CURRENCY');
    }

    const [whole, fraction] = amount.split('.');
    const cents = BigInt(whole) * 100n + BigInt(fraction);

    return new Money(cents, currency);
  }

  static zero(currency: string): Money {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error('INVALID_CURRENCY');
    }

    return new Money(0n, currency);
  }

  private static fromCents(cents: bigint, currency: string): Money {
    return new Money(cents, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('CURRENCY_MISMATCH');
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents - other.cents, this.currency);
  }

  negate(): Money {
    return Money.fromCents(-this.cents, this.currency);
  }

  isZero(): boolean {
    return this.cents === 0n;
  }

  isPositive(): boolean {
    return this.cents > 0n;
  }

  isNegative(): boolean {
    return this.cents < 0n;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency
      && this.cents === other.cents;
  }

  toJSON(): MoneyProps {
    const abs = this.cents < 0n ? -this.cents : this.cents;
    const sign = this.cents < 0n ? '-' : '';

    return {
      amount: `${sign}${abs / 100n}.${(abs % 100n)
        .toString()
        .padStart(2, '0')}`,
      currency: this.currency,
    };
  }

  toString(): string {
    return this.toJSON().amount;
  }
}