import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().default('10'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const envVars = {
  PORT: process.env.PORT || '3000',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || '10',
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
};

export const config = {
  port: parseInt(envVars.PORT, 10),
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  bcrypt: {
    rounds: parseInt(envVars.BCRYPT_ROUNDS, 10),
  },
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
};
