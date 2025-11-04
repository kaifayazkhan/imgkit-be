import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginUserSchema, RegisterUserSchema } from '../validations/user.js';
import UserModel from '../models/user.model.js';
import {
  ValidationError,
  AppError,
  UnauthorizedError,
} from '../utils/appError.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import {
  generateAccessAndRefreshToken,
  generateAccessToken,
} from '../utils/generateToken.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';

class AuthService {
  async registerUser(payload: unknown) {
    const { success, data, error } = RegisterUserSchema.safeParse(payload);
    if (!success) throw new ValidationError(error?.issues);

    const { name, email, password } = data;
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
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
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };
  }

  async loginUser(payload: unknown) {
    const { success, data, error } = LoginUserSchema.safeParse(payload);
    if (!success) throw new ValidationError(error?.issues);

    const { email, password } = data;

    const user = await UserModel.findByEmail(email);

    if (!user?.id) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const comparePassword = await bcrypt.compare(password, user.password);

    if (!comparePassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateAccessAndRefreshToken(
      user.id
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await UserModel.saveRefreshToken(hashedRefreshToken, user.id);

    logger.info(`User logged in with id: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async logoutUser(userId: number) {
    await UserModel.saveRefreshToken(null, userId);
    logger.info(`User logged out with id ${userId}`);
  }

  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const { id: userId } = jwt.verify(
      refreshToken,
      env.REFRESH_TOKEN_SECRET
    ) as {
      id: number;
    };

    if (!userId) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await UserModel.findById(userId);

    if (!user?.id || !user.refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isTokenValid) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = generateAccessToken(userId);
    logger.info(`New access token generated for user id: ${user.id}`);

    return accessToken;
  }
}

export default new AuthService();
