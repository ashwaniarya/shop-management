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
