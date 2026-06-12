export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation_error", 400);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super(message, "not_found", 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "forbidden", 403);
  }
}

export class AwsValidationError extends DomainError {
  constructor(message: string) {
    super(message, "aws_validation_error", 422);
  }
}

/** Raised when an action would exceed the organization's plan quota (HTTP 402). */
export class PlanLimitError extends DomainError {
  constructor(message: string) {
    super(message, "plan_limit", 402);
  }
}

/** Raised when a caller exceeds an endpoint's request budget (HTTP 429). */
export class RateLimitError extends DomainError {
  constructor(message = "Too many requests — slow down and try again shortly") {
    super(message, "rate_limited", 429);
  }
}
