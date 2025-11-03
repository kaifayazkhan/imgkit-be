import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  UploadImagesSchema,
  TransformImageSchema,
} from '../validations/image.js';
import { getObject, getPresignedPutUrl, uploadObject } from '../utils/s3.js';
import ImageModel from '../models/image.model.js';
import { applyTransformations } from '../utils/sharp.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
} from '../utils/appError.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import logger from '../config/logger.js';

import type { TransformedImageResponse } from '../types/image.type.js';

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  const { success, error, data } = UploadImagesSchema.safeParse(req.body);

  if (!success) {
    throw new ValidationError(error?.issues);
  }

  if (!req.user?.id) {
    throw new UnauthorizedError('Unauthorized request');
  }

  const userId = req.user.id;
  const storageKey = `uploads/${userId}-${uuidv4()}.${data?.contentType?.split('/')[1]}`;
  const uploadUrl = await getPresignedPutUrl(storageKey, data?.contentType);

  if (!uploadUrl) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to generate pre-signed url',
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  const imageId = await ImageModel.original(
    userId,
    storageKey,
    data?.contentType,
    data?.filesize
  );

  if (!imageId) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to create image record in database',
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  logger.info(`Presigned upload url generated for user id: ${userId}`);
  return new ApiResponse(
    HTTP_STATUS.CREATED,
    {
      upload_url: uploadUrl,
      image_id: imageId.id,
      storage_key: storageKey,
    },
    'Upload URL generated successfully'
  ).send(res);
});

export const transformImage = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      success,
      data: transformationSettings,
      error,
    } = TransformImageSchema.safeParse(req.body);

    if (!success) {
      throw new ValidationError(error?.issues);
    }

    const imageId = Number(req.params.id);

    if (!imageId || imageId <= 0) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid image id',
        ERROR_CODES.BAD_REQUEST
      );
    }

    const userId = Number(req.user?.id);

    if (!userId) {
      throw new UnauthorizedError('Unauthorized request');
    }

    const originalImage = await ImageModel.getOriginalImage(imageId);

    if (!originalImage) {
      throw new AppError(
        HTTP_STATUS.NOT_FOUND,
        'Image not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    if (originalImage.userId !== userId) {
      throw new AppError(
        HTTP_STATUS.FORBIDDEN,
        'Forbidden',
        ERROR_CODES.FORBIDDEN
      );
    }

    const imageURL = `${env.IMAGE_DOMAIN}/${originalImage.storageKey}`;
    const imageBuffer = await getObject(originalImage.storageKey);

    if (!imageBuffer) {
      throw new AppError(
        HTTP_STATUS.NOT_FOUND,
        'Image not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    const data = await applyTransformations(
      imageBuffer,
      transformationSettings
    );

    if (!data) {
      throw new AppError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to apply transformations to image',
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }

    const transformedImageName = `${originalImage.userId}-${uuidv4()}.${transformationSettings?.transformation.format}`;
    const imageKey = `transformed/${transformedImageName}`;
    const imageMimeType = `image/${transformationSettings?.transformation.format}`;

    const uploadImageResponse = await uploadObject(
      imageKey,
      data,
      imageMimeType
    );

    if (uploadImageResponse.$metadata.httpStatusCode !== 200) {
      throw new AppError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to upload transformed image to S3',
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }

    const transformedImage = await ImageModel.transform(
      imageKey,
      imageId,
      imageMimeType,
      data.length
    );

    if (!transformedImage) {
      throw new AppError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to record transformed image in database',
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }

    const transformedImageURL = `${env.IMAGE_DOMAIN}/${transformedImage.storageKey}`;
    logger.info(`Image transformed successfully for request id: ${imageId}`);

    return new ApiResponse(
      HTTP_STATUS.CREATED,
      {
        id: transformedImage.id,
        original_image_url: imageURL,
        transformed_image_url: transformedImageURL,
        mime_type: imageMimeType,
      },
      'Image transformed successfully'
    ).send(res);
  }
);

export const getTransformedImageById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

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

    const image = await ImageModel.findTransformedImageById(imageId, userId);

    if (!image) {
      throw new AppError(
        HTTP_STATUS.NOT_FOUND,
        'Image not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    logger.info(`Image retrieved successfully for id: ${imageId}`);
    return new ApiResponse(HTTP_STATUS.OK, {
      id: image.id,
      transformed_image_url: `${env.IMAGE_DOMAIN}/${image.transformedImageKey}`,
      original_image_url: `${env.IMAGE_DOMAIN}/${image.originalImageKey}`,
      size_in_bytes: image.sizeInBytes,
      mime_type: image.mimeType,
      created_at: image.createdAt,
    }).send(res);
  }
);

export const getUserTransformedImages = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Unauthorized request');
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const { data: result, total } =
      await ImageModel.findAllTransformedImagesForUser(userId, limit, offset);

    if (result.length === 0) {
      return new ApiResponse(HTTP_STATUS.OK, [], '', {
        total: 0,
        total_pages: 0,
        page_size: limit,
        current_page: page,
      }).send(res);
    }

    let images: TransformedImageResponse[] = [];

    for (const image of result) {
      images.push({
        id: image.id,
        transformed_image_url: `${env.IMAGE_DOMAIN}/${image.transformedImageKey}`,
        original_image_url: `${env.IMAGE_DOMAIN}/${image.originalImageKey}`,
        size_in_bytes: image.sizeInBytes,
        mime_type: image.mimeType,
        created_at: image.createdAt,
      });
    }

    return new ApiResponse(HTTP_STATUS.OK, images, '', {
      total: total,
      total_pages: Math.ceil(total / limit),
      page_size: limit,
      current_page: page,
    }).send(res);
  }
);
