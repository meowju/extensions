/**
 * Application Errors for Result Pattern
 */

export class AppError extends Error {
  constructor(message: string, public metadata?: any) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public override metadata?: any) {
    super(message, metadata);
    this.name = 'ValidationError';
  }
}
