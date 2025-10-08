import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userImage, transformedImage, type UserImage } from '../db/schema.js';

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
}

export default new ImageModel();
