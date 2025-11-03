import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  limit: 10,
  message: 'Too many requests, please try again after 2 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  message: 'Too many requests, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  message: 'Too many requests, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

router.route('/register').post(registerLimiter, register);
router.route('/login').post(loginLimiter, login);
router.route('/logout').post(verifyJWT, logout);
router.route('/refresh').post(refreshLimiter, refresh);

export default router;
