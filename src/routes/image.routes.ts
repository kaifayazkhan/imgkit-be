import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import {
  uploadImage,
  transformImage,
  getTransformedImageById,
  getUserTransformedImages,
} from '../controllers/image.controller.js';

const router: Router = Router();

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  message: 'Too many requests, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const transformLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  message: 'Too many requests, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

router.route('/').get(verifyJWT, getUserTransformedImages);
router.route('/:id').get(verifyJWT, getTransformedImageById);
router.route('/upload').post(verifyJWT, uploadLimiter, uploadImage);
router
  .route('/:id/transform')
  .post(verifyJWT, transformLimiter, transformImage);

export default router;
