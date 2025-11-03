import { desc, eq, sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transformedImage, userImage, type UserImage } from '../db/schema.js';

class ImageModel {
  async original(
    userId: number,
    storageKey: string,
    mimeType: string,
    sizeInBytes: number
  ) {
    const [result] = await db
      .insert(userImage)
      .values({
        userId,
        storageKey,
        mimeType,
        sizeInBytes,
      })
      .returning({ id: userImage.id });
    return result;
  }

  async transform(
    storageKey: string,
    originalImageId: number,
    mimeType: string,
    sizeInBytes: number
  ) {
    const [result] = await db
      .insert(transformedImage)
      .values({
        storageKey,
        originalImageId,
        mimeType,
        sizeInBytes,
      })
      .returning({
        id: transformedImage.id,
        storageKey: transformedImage.storageKey,
      });
    return result;
  }

  async getOriginalImage(id: number): Promise<UserImage | undefined> {
    const [result] = await db
      .select()
      .from(userImage)
      .where(eq(userImage.id, id));
    return result;
  }

  async findTransformedImageById(imageId: number, userId: number) {
    const [result] = await db
      .select({
        id: transformedImage.id,
        transformedImageKey: transformedImage.storageKey,
        sizeInBytes: transformedImage.sizeInBytes,
        mimeType: transformedImage.mimeType,
        createdAt: transformedImage.createdAt,
        originalImageId: transformedImage.originalImageId,
        originalImageKey: userImage.storageKey,
      })
      .from(transformedImage)
      .innerJoin(userImage, eq(transformedImage.originalImageId, userImage.id))
      .where(
        and(eq(userImage.userId, userId), eq(transformedImage.id, imageId))
      )
      .limit(1);

    return result ?? null;
  }

  async findAllTransformedImagesForUser(
    userId: number,
    limit: number,
    offset: number
  ) {
    const result = await db
      .select({
        id: transformedImage.id,
        transformedImageKey: transformedImage.storageKey,
        sizeInBytes: transformedImage.sizeInBytes,
        mimeType: transformedImage.mimeType,
        createdAt: transformedImage.createdAt,
        originalImageId: transformedImage.originalImageId,
        originalImageKey: userImage.storageKey,
      })
      .from(transformedImage)
      .innerJoin(userImage, eq(transformedImage.originalImageId, userImage.id))
      .where(eq(userImage.userId, userId))
      .orderBy(desc(transformedImage.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transformedImage)
      .innerJoin(userImage, eq(transformedImage.originalImageId, userImage.id))
      .where(eq(userImage.userId, userId));

    const total = Number(countResult[0]?.count || 0);

    return { total, data: result ?? [] };
  }
}

export default new ImageModel();
