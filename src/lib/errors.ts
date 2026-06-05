// Typed application errors. Thrown by services to express domain failures
// without knowing about HTTP; the API boundary maps `status` to a response.

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

/** Input that violates a domain invariant (HTTP 400). */
export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super(message, 400);
  }
}

/** A referenced resource does not exist or is not visible to the caller (404). */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}
