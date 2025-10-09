import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';
import { RegisterUserSchema, LoginUserSchema } from '../validations/user.js';
import UserModel from '../models/user.model.js';
import {
  generateAccessAndRefreshToken,
  generateAccessToken,
} from '../utils/generateToken.js';
import { env } from '../config/env.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { success, data, error } = RegisterUserSchema.safeParse(req.body);

  if (!success) {
    throw new AppError(422, 'Validation Error', error?.issues);
  }

  const { name, email, password } = data;

  const user = await UserModel.findByEmail(email);

  if (user) {
    throw new AppError(400, 'User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await UserModel.create(name, email, hashedPassword);

  if (!newUser) {
    throw new AppError(500, 'Failed to register');
  }

  return new ApiResponse(
    201,
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
    throw new AppError(422, 'Validation Error', error?.issues);
  }

  const { email, password } = data;

  const user = await UserModel.findByEmail(email);

  if (!user?.id) {
    throw new AppError(401, 'Invalid email or password');
  }

  const comparePassword = await bcrypt.compare(password, user.password);

  if (!comparePassword) {
    throw new AppError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = generateAccessAndRefreshToken(user.id);

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await UserModel.saveRefreshToken(hashedRefreshToken, user.id);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  res.cookie('accessToken', accessToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);

  return new ApiResponse(
    200,
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
    throw new AppError(401, 'Unauthorized request');
  }

  const userId = Number(req.user.id);
  await UserModel.saveRefreshToken(null, userId);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  return new ApiResponse(200, {}, 'Logout successful').send(res);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new AppError(401, 'Unauthorized request');
  }

  const { id: userId } = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
    id: number;
  };

  if (!userId) {
    throw new AppError(400, 'Invalid refresh token');
  }

  const user = await UserModel.findById(userId);

  if (!user?.id || !user.refreshToken) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const compareRefreshToken = await bcrypt.compare(
    refreshToken,
    user.refreshToken
  );

  if (!compareRefreshToken) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const accessToken = generateAccessToken(userId);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
  };

  res.cookie('accessToken', accessToken, cookieOptions);

  return new ApiResponse(200, {
    access_token: accessToken,
  }).send(res);
});
