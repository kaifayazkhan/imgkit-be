import { v4 as uuidv4 } from 'uuid';
import {
  TransformImageSchema,
  UploadImagesSchema,
} from '../validations/image.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { AppError, ValidationError } from '../utils/appError.js';
import { getObject, getPresignedPutUrl, uploadObject } from '../utils/s3.js';
import { HTTP_STATUS } from '../utils/httpStatus.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { applyTransformations } from '../utils/sharp.js';
import ImageModel from '../models/image.model.js';

class ImageService {
  async generateUploadUrl(payload: unknown, userId: number) {
    const { success, error, data } = UploadImagesSchema.safeParse(payload);

    if (!success) {
      throw new ValidationError(error?.issues);
    }

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
    return {
      upload_url: uploadUrl,
      image_id: imageId.id,
      storage_key: storageKey,
    };
  }

  async transformImage(payload: unknown, imageId: number, userId: number) {
    const {
      success,
      data: transformationSettings,
      error,
    } = TransformImageSchema.safeParse(payload);

    if (!success) {
      throw new ValidationError(error?.issues);
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

    return {
      id: transformedImage.id,
      original_image_url: imageURL,
      transformed_image_url: transformedImageURL,
      mime_type: imageMimeType,
    };
  }

  async getTransformedImageById(userId: number, imageId: number) {
    const image = await ImageModel.findTransformedImageById(imageId, userId);
    if (!image) {
      throw new AppError(
        HTTP_STATUS.NOT_FOUND,
        'Image not found',
        ERROR_CODES.NOT_FOUND
      );
    }

    return {
      id: image.id,
      transformed_image_url: `${env.IMAGE_DOMAIN}/${image.transformedImageKey}`,
      original_image_url: `${env.IMAGE_DOMAIN}/${image.originalImageKey}`,
      size_in_bytes: image.sizeInBytes,
      mime_type: image.mimeType,
      created_at: image.createdAt,
    };
  }

  async getUserTransformedImages(userId: number, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { data, total } = await ImageModel.findAllTransformedImagesForUser(
      userId,
      limit,
      offset
    );

    const images = data.map((image) => ({
      id: image.id,
      transformed_image_url: `${env.IMAGE_DOMAIN}/${image.transformedImageKey}`,
      original_image_url: `${env.IMAGE_DOMAIN}/${image.originalImageKey}`,
      size_in_bytes: image.sizeInBytes,
      mime_type: image.mimeType,
      created_at: image.createdAt,
    }));

    return {
      images,
      pagination: {
        total,
        total_pages: Math.ceil(total / limit),
        page_size: limit,
        current_page: page,
      },
    };
  }
}

export default new ImageService();
