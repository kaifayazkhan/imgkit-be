import sharp from 'sharp';
import type { TransformImageSchemaType } from '../validations/image.js';

export async function applyTransformations(
  path: string | Buffer | Uint8Array,
  options: TransformImageSchemaType
) {
  try {
    let image = sharp(path);

    const { resize, crop, rotate, quality, lossless, grayscale, format } =
      options.transformation;

    const q = quality || 80;

    if (crop) {
      const { width, height, x, y } = crop;
      image = image.extract({ width, height, left: x, top: y });
    }

    if (resize) {
      const { width, height, fit } = resize;
      image = image.resize(width, height, {
        fit: fit || 'cover',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    if (rotate) {
      image = image.rotate(rotate);
    }

    if (grayscale) {
      image = image.grayscale();
    }

    image = image.toColourspace('srgb');

    switch (format) {
      case 'avif':
        image = image.avif({
          quality: q,
          effort: 4,
          chromaSubsampling: '4:4:4',
        });
        break;
      case 'webp':
        image = image.webp({
          quality: q,
          effort: 4,
          lossless: lossless || false,
        });
        break;
      case 'png':
        image = image.png({
          quality: q,
          effort: 4,
        });
        break;
      case 'jpeg':
        image = image.jpeg({
          quality: q,
          mozjpeg: true,
          progressive: true,
          chromaSubsampling: '4:4:4',
        });
        break;
      default:
        image = image.webp({
          quality: q,
          effort: 4,
          lossless: lossless || false,
        });
        break;
    }

    return await image.toBuffer();
  } catch (error) {
    throw new Error('Image transformation failed');
  }
}
