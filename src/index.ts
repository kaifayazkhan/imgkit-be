import { env } from './config/env.js';
import app from './app.js';
import logger from './config/logger.js';
import { pool } from './db/index.js';

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      logger.info(`Server is running on PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    await pool.end();
    process.exit(1);
  }
};

startServer();
