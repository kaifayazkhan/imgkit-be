import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

export const requestMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startHrTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;

    const logLevel = res.statusCode < 400 ? 'info' : 'error';

    logger[logLevel]({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${durationMs.toFixed(2)} ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: res.get('Content-Length') || 0,
      message: `${req.method} ${req.originalUrl} ${res.statusCode} in ${durationMs.toFixed(2)} ms`,
    });
  });

  next();
};
