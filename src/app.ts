import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import errorHandler from './middlewares/error.middleware.js';
import { requestMiddleware } from './middlewares/request.middleware.js';
import routes from './routes/index.js';
import { HTTP_STATUS } from './utils/httpStatus.js';
import { env } from './config/env.js';

const app = express();
const allowedOrigins =
  env.CORS_ORIGINS?.map((o) => o.trim()).filter(Boolean) ?? [];

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());

app.use(requestMiddleware);

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    message: 'OK',
  });
});

app.use((req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).send('Requested page was not found.');
});

app.use(errorHandler);

export default app;
