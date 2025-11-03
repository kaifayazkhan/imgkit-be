import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './appError.js';
import { HTTP_STATUS } from './httpStatus.js';
import { ERROR_CODES } from './errorCodes.js';

export const generateAccessToken = (id: number) => {
  try {
    return jwt.sign({ id }, env.ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });
  } catch (err) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to generate access token',
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

export const generateRefreshToken = (id: number) => {
  try {
    return jwt.sign(
      {
        id,
      },
      env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: '15d',
      }
    );
  } catch (err) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to generate refresh token',
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

export const generateAccessAndRefreshToken = (id: number) => {
  return {
    accessToken: generateAccessToken(id),
    refreshToken: generateRefreshToken(id),
  };
};
