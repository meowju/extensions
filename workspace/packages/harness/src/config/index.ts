/**
 * Centralized Configuration Management
 * Loads environment variables with validation and provides typed access
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Configuration schema with validation
const configSchema = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_BASE_URL: z.string().url().default('http://localhost:3000/api/v1'),
  API_TIMEOUT: z.coerce.number().int().positive().default(30000),

  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_PATH: z.string().default('./data/app.db'),
  DATABASE_VERBOSE: z.coerce.boolean().default(false),

  // JWT
  JWT_SECRET: z.string().min(32).default('dev-secret-change-in-production-min-32-chars'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-change-in-production'),
  JWT_ACCESS_EXPIRY: z.coerce.number().int().positive().default(900), // 15 minutes
  JWT_REFRESH_EXPIRY: z.coerce.number().int().positive().default(604800), // 7 days

  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(20).default(12),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple', 'combined']).default('combined'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  LOG_ENABLE_FILE: z.coerce.boolean().default(true),
  LOG_ENABLE_CONSOLE: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60000), // 1 minute
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Feature Flags
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`
    );
    throw new Error(
      `Configuration validation failed:\n${errors.join('\n')}\n\n` +
        'Please check your .env file or environment variables.'
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/**
 * Get configuration (cached after first load)
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

/**
 * Reset configuration cache (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

/**
 * Check if running in specific environment
 */
export function isEnvironment(env: 'development' | 'test' | 'production'): boolean {
  return getConfig().NODE_ENV === env;
}

export const config = {
  get: getConfig,
  load: loadConfig,
  reset: resetConfig,
  is: isEnvironment,
};
