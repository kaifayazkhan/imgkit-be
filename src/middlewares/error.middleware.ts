import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';
import type { AppError } from '../utils/appError.js';

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    code: err.code,
    message: err.message,
    status: err.statusCode || 500,
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    errors: err?.errors,
    stack: err?.stack,
  });

  res.status(err.statusCode || 500).json({
    status: err.statusCode,
    code: err.code,
    message: err.message || 'Internal Server Error',
    errors: err.errors || [],
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  });
};

export default errorHandler;
