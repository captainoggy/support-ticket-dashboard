/** Errors carrying an HTTP status; the central error handler maps them to responses. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(403, message);
  }
}
