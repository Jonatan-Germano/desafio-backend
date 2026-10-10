import { Money } from './money';

describe('Money', () => {
  describe('from', () => {
    it('should create money from a valid amount', () => {
      const money = Money.from({
        amount: '123.45',
        currency: 'BRL',
      });

      expect(money.toString()).toBe('123.45');
      expect(money.currency).toBe('BRL');
    });

    it('should accept zero', () => {
      const money = Money.from({
        amount: '0.00',
        currency: 'BRL',
      });

      expect(money.isZero()).toBe(true);
    });

    it.each([
      '1',
      '1.0',
      '1.234',
      '-1.00',
      '+1.00',
      '01.00',
      '1,00',
      '',
      'abc',
    ])('should reject invalid amount "%s"', (amount) => {
      expect(() =>
        Money.from({ amount, currency: 'BRL' }),
      ).toThrow('INVALID_MONEY_AMOUNT');
    });

    it.each(['brl', 'US', 'USDD', '123', '', 'R$'])(
      'should reject invalid currency "%s"',
      (currency) => {
        expect(() =>
          Money.from({ amount: '10.00', currency }),
        ).toThrow('INVALID_CURRENCY');
      },
    );
  });

  describe('zero', () => {
    it('should create zero money', () => {
      const money = Money.zero('BRL');

      expect(money.isZero()).toBe(true);
      expect(money.toJSON()).toEqual({
        amount: '0.00',
        currency: 'BRL',
      });
    });

    it('should reject an invalid currency', () => {
      expect(() => Money.zero('brl')).toThrow('INVALID_CURRENCY');
    });
  });

  describe('add', () => {
    it('should add amounts correctly', () => {
      const result = Money.from({
        amount: '10.25',
        currency: 'BRL',
      }).add(
        Money.from({ amount: '5.75', currency: 'BRL' }),
      );

      expect(result.toJSON()).toEqual({
        amount: '16.00',
        currency: 'BRL',
      });
    });

    it('should preserve cent precision', () => {
      const result = Money.from({
        amount: '0.10',
        currency: 'BRL',
      }).add(
        Money.from({ amount: '0.20', currency: 'BRL' }),
      );

      expect(result.toString()).toBe('0.30');
    });

    it('should reject different currencies', () => {
      const brl = Money.from({ amount: '10.00', currency: 'BRL' });
      const usd = Money.from({ amount: '10.00', currency: 'USD' });

      expect(() => brl.add(usd)).toThrow('CURRENCY_MISMATCH');
    });
  });

  describe('subtract', () => {
    it('should subtract amounts correctly', () => {
      const result = Money.from({
        amount: '10.00',
        currency: 'BRL',
      }).subtract(
        Money.from({ amount: '3.25', currency: 'BRL' }),
      );

      expect(result.toString()).toBe('6.75');
    });

    it('should support negative results', () => {
      const result = Money.from({
        amount: '5.00',
        currency: 'BRL',
      }).subtract(
        Money.from({ amount: '8.00', currency: 'BRL' }),
      );

      expect(result.toString()).toBe('-3.00');
      expect(result.isNegative()).toBe(true);
    });

    it('should reject different currencies', () => {
      const brl = Money.from({ amount: '10.00', currency: 'BRL' });
      const usd = Money.from({ amount: '3.00', currency: 'USD' });

      expect(() => brl.subtract(usd)).toThrow('CURRENCY_MISMATCH');
    });
  });

  describe('negate', () => {
    it('should negate a positive amount', () => {
      const result = Money.from({
        amount: '12.34',
        currency: 'BRL',
      }).negate();

      expect(result.toString()).toBe('-12.34');
      expect(result.isNegative()).toBe(true);
    });

    it('should negate a negative amount', () => {
      const result = Money.from({
        amount: '12.34',
        currency: 'BRL',
      }).negate().negate();

      expect(result.toString()).toBe('12.34');
    });
  });

  describe('comparisons', () => {
    it('should identify zero, positive and negative amounts', () => {
      expect(Money.zero('BRL').isZero()).toBe(true);

      expect(
        Money.from({ amount: '1.00', currency: 'BRL' }).isPositive(),
      ).toBe(true);

      expect(
        Money.from({ amount: '1.00', currency: 'BRL' })
          .negate()
          .isNegative(),
      ).toBe(true);
    });

    it('should compare amounts with isLessThan', () => {
      const smaller = Money.from({ amount: '10.00', currency: 'BRL' });
      const larger = Money.from({ amount: '10.01', currency: 'BRL' });

      expect(smaller.isLessThan(larger)).toBe(true);
      expect(larger.isLessThan(smaller)).toBe(false);
    });

    it('should reject comparison across currencies', () => {
      const brl = Money.from({ amount: '10.00', currency: 'BRL' });
      const usd = Money.from({ amount: '11.00', currency: 'USD' });

      expect(() => brl.isLessThan(usd)).toThrow('CURRENCY_MISMATCH');
    });

    it('should compare amount and currency with equals', () => {
      const first = Money.from({ amount: '10.00', currency: 'BRL' });
      const same = Money.from({ amount: '10.00', currency: 'BRL' });
      const differentAmount = Money.from({
        amount: '10.01',
        currency: 'BRL',
      });
      const differentCurrency = Money.from({
        amount: '10.00',
        currency: 'USD',
      });

      expect(first.equals(same)).toBe(true);
      expect(first.equals(differentAmount)).toBe(false);
      expect(first.equals(differentCurrency)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const money = Money.from({
        amount: '123.45',
        currency: 'BRL',
      });

      expect(money.toJSON()).toEqual({
        amount: '123.45',
        currency: 'BRL',
      });
      expect(JSON.stringify(money)).toBe(
        '{"amount":"123.45","currency":"BRL"}',
      );
    });

    it('should serialize a negative amount correctly', () => {
      const money = Money.from({
        amount: '1.25',
        currency: 'BRL',
      }).negate();

      expect(money.toJSON()).toEqual({
        amount: '-1.25',
        currency: 'BRL',
      });
    });

    it('should preserve trailing zeroes', () => {
      const money = Money.from({
        amount: '10.50',
        currency: 'BRL',
      });

      expect(money.toString()).toBe('10.50');
    });
  });
});