import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import { UnauthorizedError } from '../utils/appError.js';
import { cookieOptions } from '../utils/cookie.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';

import AuthService from '../services/auth.service.js';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../utils/constants.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { id, name, email } = await AuthService.registerUser(req.body);

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    {
      id,
      name,
      email,
    },
    'User registered successfully'
  ).send(res);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.loginUser(
    req.body
  );

  res.cookie(ACCESS_TOKEN_KEY, accessToken, cookieOptions);
  res.cookie(REFRESH_TOKEN_KEY, refreshToken, cookieOptions);

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
  await AuthService.logoutUser(userId);

  res.clearCookie(ACCESS_TOKEN_KEY, cookieOptions);
  res.clearCookie(REFRESH_TOKEN_KEY, cookieOptions);

  return new ApiResponse(HTTP_STATUS.OK, {}, 'Logout successful').send(res);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const accessToken = await AuthService.refreshAccessToken(
    req.cookies?.refreshToken
  );
  res.cookie(ACCESS_TOKEN_KEY, accessToken, cookieOptions);

  return new ApiResponse(HTTP_STATUS.OK, {
    access_token: accessToken,
  }).send(res);
});
