import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
} from '../utils/appError.js';
import { RegisterUserSchema, LoginUserSchema } from '../validations/user.js';
import UserModel from '../models/user.model.js';
import {
  generateAccessAndRefreshToken,
  generateAccessToken,
} from '../utils/generateToken.js';
import { cookieOptions } from '../utils/cookie.js';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import logger from '../config/logger.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { success, data, error } = RegisterUserSchema.safeParse(req.body);

  if (!success) {
    throw new ValidationError(error?.issues);
  }

  const { name, email, password } = data;

  const user = await UserModel.findByEmail(email);

  if (user) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'User already exists',
      ERROR_CODES.BAD_REQUEST
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await UserModel.create(name, email, hashedPassword);

  if (!newUser) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to register',
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  logger.info(`New user created with id: ${newUser.id}`);
  return new ApiResponse(
    HTTP_STATUS.CREATED,
    {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
    'User registered successfully'
  ).send(res);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { success, data, error } = LoginUserSchema.safeParse(req.body);

  if (!success) {
    throw new ValidationError(error?.issues);
  }

  const { email, password } = data;

  const user = await UserModel.findByEmail(email);

  if (!user?.id) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const comparePassword = await bcrypt.compare(password, user.password);

  if (!comparePassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const { accessToken, refreshToken } = generateAccessAndRefreshToken(user.id);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await UserModel.saveRefreshToken(hashedRefreshToken, user.id);

  res.cookie('accessToken', accessToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);

  logger.info(`User logged in with id: ${user.id}`);
  return new ApiResponse(
    HTTP_STATUS.OK,
    {
      id: user.id,
      email: user.email,
      access_token: accessToken,
    },
    'Login successful'
  ).send(res);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new UnauthorizedError('Unauthorized request');
  }

  const userId = Number(req.user.id);
  await UserModel.saveRefreshToken(null, userId);

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  logger.info(`User logged out with id ${userId}`);

  return new ApiResponse(200, {}, 'Logout successful').send(res);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new UnauthorizedError('Missing refresh token');
  }

  const { id: userId } = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
    id: number;
  };

  if (!userId) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await UserModel.findById(userId);

  if (!user?.id || !user.refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const compareRefreshToken = await bcrypt.compare(
    refreshToken,
    user.refreshToken
  );

  if (!compareRefreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const accessToken = generateAccessToken(userId);

  res.cookie('accessToken', accessToken, cookieOptions);

  logger.info(`New access token generated for user id: ${user.id}`);

  return new ApiResponse(HTTP_STATUS.OK, {
    access_token: accessToken,
  }).send(res);
});
