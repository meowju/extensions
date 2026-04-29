import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'rest_api_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFile: process.env.LOG_ENABLE_FILE !== 'false',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    format: process.env.LOG_FORMAT || 'simple',
  },

  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
} as const;

export type Config = typeof config;

export function getConfig(): Config {
  return config;
}
