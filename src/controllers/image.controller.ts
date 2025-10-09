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
import AppError from '../utils/appError.js';
import type { TransformedImageResponse } from '../types/image.type.js';

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  const { success, error, data } = UploadImagesSchema.safeParse(req.body);

  if (!success) {
    throw new AppError(422, 'Validation Error', error?.issues);
  }

  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized request');
  }

  const userId = req.user.id;
  const storageKey = `uploads/${userId}-${uuidv4()}.${data?.contentType?.split('/')[1]}`;
  const uploadUrl = await getPresignedPutUrl(storageKey, data?.contentType);

  if (!uploadUrl) {
    throw new AppError(500, 'Failed to generate pre-signed url');
  }

  const imageId = await ImageModel.original(
    userId,
    storageKey,
    data?.contentType,
    data?.filesize
  );

  if (!imageId) {
    throw new AppError(500, 'Failed to create image record in database');
  }

  return new ApiResponse(
    201,
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
      throw new AppError(422, 'Validation Error', error?.issues);
    }

    const imageId = Number(req.params.id);

    if (!imageId || imageId <= 0) {
      throw new AppError(400, 'Invalid image id');
    }

    if (!req.user?.id) {
      throw new AppError(401, 'Unauthorized request');
    }

    const userId = Number(req.user.id);
    const originalImage = await ImageModel.getOriginalImage(imageId);

    if (!originalImage) {
      throw new AppError(404, 'Image not found');
    }

    if (originalImage.userId !== userId) {
      throw new AppError(403, 'Forbidden');
    }

    const imageURL = `${env.IMAGE_DOMAIN}/${originalImage.storageKey}`;
    const imageBuffer = await getObject(originalImage.storageKey);

    if (!imageBuffer) {
      throw new AppError(404, 'Image not found');
    }

    const data = await applyTransformations(
      imageBuffer,
      transformationSettings
    );

    if (!data) {
      throw new AppError(500, 'Failed to apply transformations to image');
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
      throw new AppError(500, 'Failed to upload transformed image to S3');
    }

    const transformedImage = await ImageModel.transform(
      imageKey,
      imageId,
      imageMimeType,
      data.length
    );

    if (!transformedImage) {
      throw new AppError(500, 'Failed to record transformed image in database');
    }

    const transformedImageURL = `${env.IMAGE_DOMAIN}/${transformedImage.storageKey}`;

    return new ApiResponse(201, {
      id: transformedImage.id,
      original_image_url: imageURL,
      transformed_image_url: transformedImageURL,
      mime_type: imageMimeType,
    }).send(res);
  }
);

export const getTransformedImageById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(401, 'Unauthorized request');
    }

    const imageId = Number(req.params.id);

    if (!imageId || imageId <= 0) {
      throw new AppError(400, 'Invalid image id');
    }

    const image = await ImageModel.findTransformedImageById(imageId, userId);

    if (!image) {
      throw new AppError(404, 'Image not found');
    }

    return new ApiResponse(200, {
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
      throw new AppError(401, 'Unauthorized request');
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const { data: result, total } =
      await ImageModel.findAllTransformedImagesForUser(userId, limit, offset);

    if (result.length === 0) {
      return new ApiResponse(200, [], '', {
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

    return new ApiResponse(200, images, '', {
      total: total,
      total_pages: Math.ceil(total / limit),
      page_size: limit,
      current_page: page,
    }).send(res);
  }
);
