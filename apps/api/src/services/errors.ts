export class DomainValidationError extends Error {
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'DomainValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// The PIN matched, but this account must pick a password before it gets a session.
export class MustChangePasswordError extends Error {
  readonly upgradeToken: string;

  constructor(upgradeToken: string) {
    super('Choose a password to finish sign-in');
    this.name = 'MustChangePasswordError';
    this.upgradeToken = upgradeToken;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class InsufficientStockError extends DomainValidationError {
  readonly availableQuantity: number;
  readonly requestedQuantity: number;

  constructor(availableQuantity: number, requestedQuantity: number) {
    super(`Insufficient stock: available ${availableQuantity}, requested ${requestedQuantity}`);
    this.name = 'InsufficientStockError';
    this.availableQuantity = availableQuantity;
    this.requestedQuantity = requestedQuantity;
  }
}
