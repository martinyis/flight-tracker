export class AppError extends Error {
  public readonly statusCode: number;
  public readonly data: Record<string, unknown>;

  constructor(message: string, statusCode: number, data: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, data: Record<string, unknown> = {}) {
    super(message, 400, data);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string, data: Record<string, unknown> = {}) {
    super(message, 402, data);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, data: Record<string, unknown> = {}) {
    super(message, 409, data);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string, data: Record<string, unknown> = {}) {
    super(message, 429, data);
  }
}
