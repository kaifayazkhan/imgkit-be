import type { ZodError } from 'zod';
import { HTTP_STATUS } from './httpStatus.js';
import { ERROR_CODES } from './errorCodes.js';

export class AppError extends Error {
  statusCode: number;
  data: null | object;
  success: boolean;
  code: string;
  errors: Array<{ message: string; field?: string }>;

  constructor(
    statusCode: number,
    message = 'Something went wrong',
    code: string,
    errors: ZodError[] | any[] = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.code = code;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(errors: ZodError['issues'] = []) {
    const transformedErrors = errors.map((issue) => ({
      message: issue.message,
      field: issue.path.join('.'),
    }));
    super(
      HTTP_STATUS.BAD_REQUEST,
      'Validation Failed',
      ERROR_CODES.BAD_REQUEST,
      transformedErrors
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized request', errors = []) {
    super(HTTP_STATUS.UNAUTHORIZED, message, ERROR_CODES.UNAUTHORIZED, errors);
  }
}
