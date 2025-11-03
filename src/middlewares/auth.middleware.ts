import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, UnauthorizedError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

interface JwtPayload {
  id: number;
}

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    try {
      const { id } = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;

      if (id === undefined || id === null) {
        next(new UnauthorizedError('Invalid token payload'));
      }

      req.user = { id };
      next();
    } catch (err) {
      return next(
        new AppError(
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid or expired token',
          ERROR_CODES.UNAUTHORIZED
        )
      );
    }
  }
);
