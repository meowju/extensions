/**
 * Key Format Validation
 * Validates API keys per provider requirements
 */

import { type KeyProvider, type KeyValidationResult, PROVIDER_CONFIG } from './types.js';

/**
 * Validate an API key format based on provider
 */
export function validateKey(provider: KeyProvider, apiKey: string): KeyValidationResult {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  const config = PROVIDER_CONFIG[provider];
  
  if (!config) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }

  // Check against provider-specific patterns
  for (const pattern of config.patterns) {
    if (pattern.test(trimmedKey)) {
      return { valid: true };
    }
  }

  // For "other" provider, accept any non-empty key
  if (provider === 'other') {
    return { valid: true };
  }

  return { 
    valid: false, 
    error: `Invalid ${config.name} key format`,
    hint: `Expected format: ${config.placeholder}`
  };
}

/**
 * Validate key name is not empty and reasonable length
 */
export function validateKeyName(name: string): KeyValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Key name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Key name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Key name must be at least 2 characters' };
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: 'Key name must be less than 50 characters' };
  }

  return { valid: true };
}

/**
 * Check for duplicate provider keys
 * Returns false if a key for this provider already exists (unless overwriting)
 */
export function checkDuplicateProvider(
  existingKeys: { provider: KeyProvider }[], 
  provider: KeyProvider,
  excludeKeyId?: string
): boolean {
  return existingKeys.some(
    key => key.provider === provider
  );
}

/**
 * Get all supported providers as array
 */
export function getSupportedProviders(): KeyProvider[] {
  return Object.keys(PROVIDER_CONFIG) as KeyProvider[];
}

/**
 * Get provider display info
 */
export function getProviderDisplay(provider: KeyProvider) {
  return PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.other;
}

/**
 * Parse optional expiry date
 */
export function parseExpiryDate(expiry?: string): Date | undefined {
  if (!expiry) return undefined;
  
  const date = new Date(expiry);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  
  return date;
}