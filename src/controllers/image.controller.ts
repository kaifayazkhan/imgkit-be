import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import { AppError, UnauthorizedError } from '../utils/appError.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

import ImageService from '../services/image.service.js';

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('Unauthorized request');
  }

  const result = await ImageService.generateUploadUrl(req.body, userId);

  return new ApiResponse(
    HTTP_STATUS.CREATED,
    result,
    'Upload URL generated successfully'
  ).send(res);
});

export const transformImage = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = Number(req.user?.id);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized request');
    }

    const imageId = Number(req.params.id);
    if (!imageId || imageId <= 0) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid image id',
        ERROR_CODES.BAD_REQUEST
      );
    }

    const result = await ImageService.transformImage(req.body, imageId, userId);

    return new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      'Image transformed successfully'
    ).send(res);
  }
);

export const getTransformedImageById = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.id) throw new UnauthorizedError('Unauthorized request');

    const imageId = Number(req.params.id);
    if (!imageId || imageId <= 0) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid image id',
        ERROR_CODES.BAD_REQUEST
      );
    }

    const result = await ImageService.getTransformedImageById(
      req.user.id,
      imageId
    );
    return new ApiResponse(
      HTTP_STATUS.OK,
      result,
      'Image retrieved successfully'
    ).send(res);
  }
);

export const getUserTransformedImages = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.id) throw new UnauthorizedError('Unauthorized request');
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const { images, pagination } = await ImageService.getUserTransformedImages(
      req.user.id,
      page,
      limit
    );
    return new ApiResponse(HTTP_STATUS.OK, images, '', pagination).send(res);
  }
);
