export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor() {
    super('INSUFFICIENT_BALANCE');
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor() {
    super('CURRENCY_MISMATCH');
  }
}

export class InvalidTransactionStateError extends DomainError {
  constructor(status: string) {
    super(
      'INVALID_TRANSACTION_STATE',
      `A transação não pode mudar de estado a partir de ${status}.`,
    );
  }
}