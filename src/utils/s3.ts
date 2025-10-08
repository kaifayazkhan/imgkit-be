import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
});

const BUCKET_NAME = env.AWS_S3_BUCKET_NAME;

export async function getPresignedPutUrl(key: string, contentType: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(client, command, { expiresIn: 180 });
  } catch (error) {
    logger.error(`Failed to generate presigned url for put request: ${error}`);
    throw new Error('Failed to generate presigned url');
  }
}

export async function uploadObject(
  key: string,
  imageBuffer: Buffer,
  contentType: string
) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Body: imageBuffer,
    });

    return await client.send(command);
  } catch (error) {
    logger.error(`Failed to upload object: ${error}`);
    throw error instanceof Error ? error : new Error('Failed to upload object');
  }
}

export async function getObject(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await client.send(command);

    if (!response.Body) {
      throw new Error('No response body');
    }

    return await response.Body.transformToByteArray();
  } catch (error) {
    logger.error(`Failed to get object: ${error}`);
    throw error instanceof Error ? error : new Error('Failed to get object');
  }
}
