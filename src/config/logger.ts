import pino from 'pino';
import { env } from './env.js';

let transport;

if (env.NODE_ENV === 'production') {
  transport = pino.transport({
    targets: [
      {
        target: '@logtail/pino',
        options: {
          sourceToken: env.BETTER_STACK_SOURCE_TOKEN,
          options: { endpoint: env.BETTER_STACK_ENDPOINT },
        },
      },
    ],
  });
} else {
  transport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });
}

const logger = pino(
  {
    level: env.LOG_LEVEL ?? 'info',
  },
  transport
);

export default logger;
