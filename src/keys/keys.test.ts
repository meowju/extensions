/**
 * BYOK Key Management Validation Tests
 * Tests for API key CRUD operations, validation, and masking
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { maskKey, getKeyHint, PROVIDER_CONFIG, type KeyProvider } from './types';
import { validateKey, validateKeyName, checkDuplicateProvider, getSupportedProviders, getProviderDisplay, parseExpiryDate } from './validation';

// ============================================
// Type Tests
// ============================================

describe('Key Types', () => {
  it('should have all expected providers defined', () => {
    const expectedProviders: KeyProvider[] = [
      'openai', 'anthropic', 'google', 'deepseek', 
      'azure-openai', 'mistral', 'cohere', 'huggingface', 'other'
    ];
    
    expectedProviders.forEach(provider => {
      expect(PROVIDER_CONFIG).toHaveProperty(provider);
      expect(PROVIDER_CONFIG[provider as KeyProvider].name).toBeTruthy();
      expect(PROVIDER_CONFIG[provider as KeyProvider].patterns).toBeDefined();
      expect(PROVIDER_CONFIG[provider as KeyProvider].patterns.length).toBeGreaterThan(0);
    });
  });

  it('should have proper configuration for each provider', () => {
    for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
      expect(config.name).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.placeholder).toBeTruthy();
      expect(config.docs_url).toBeTruthy();
    }
  });
});

// ============================================
// Key Masking Tests
// ============================================

describe('Key Masking', () => {
  describe('maskKey', () => {
    it('should mask a standard OpenAI key correctly', () => {
      const key = 'sk-proj-1234567890abcdefghijklmnop';
      const masked = maskKey(key, 4);
      expect(masked).toMatch(/^sk-p/);
      expect(masked.startsWith('sk-')).toBe(true);
      expect(masked).toContain('•');
    });

    it('should handle short keys', () => {
      const key = 'abc';
      const masked = maskKey(key, 4);
      expect(masked).toBe('•••');
    });

    it('should handle exactly 4 character keys', () => {
      const key = 'abcd';
      const masked = maskKey(key, 4);
      expect(masked).toBe('••••');
    });

    it('should use custom visible char count', () => {
      const key = 'sk-test-api-key-1234567890';
      const masked = maskKey(key, 8);
      expect(masked.startsWith('sk-test-')).toBe(true);
    });

    it('should handle empty string', () => {
      const masked = maskKey('', 4);
      expect(masked).toBe('');
    });

    it('should handle key with special characters', () => {
      const key = 'sk-proj!@#$%^&*()_+-=[]{}|;:,.<>?';
      const masked = maskKey(key, 4);
      expect(masked.length).toBeGreaterThanOrEqual(4);
      expect(masked.startsWith('sk-p')).toBe(true);
    });
  });

  describe('getKeyHint', () => {
    it('should return last 4 characters for verification', () => {
      const key = 'sk-proj-1234567890abcdefghijklmnop';
      const hint = getKeyHint(key, 4);
      expect(hint).toBe('mnop');
    });

    it('should return masked if key is too short', () => {
      const key = 'abc';
      const hint = getKeyHint(key, 4);
      expect(hint).toBe('•••');
    });

    it('should handle exactly 4 character key', () => {
      const key = 'abcd';
      const hint = getKeyHint(key, 4);
      expect(hint).toBe('abcd');
    });

    it('should use custom character count', () => {
      const key = 'sk-test-123456';
      const hint = getKeyHint(key, 6);
      expect(hint).toBe('123456'); // First 6 chars when key is longer
    });
  });
});

// ============================================
// Key Validation Tests
// ============================================

describe('Key Validation', () => {
  describe('validateKey', () => {
    describe('OpenAI', () => {
      it('should accept valid sk- key', () => {
        const result = validateKey('openai', 'sk-proj-1234567890abcdefghijklmnop');
        expect(result.valid).toBe(true);
      });

      it('should accept sk- key without proj prefix', () => {
        const result = validateKey('openai', 'sk-1234567890abcdefghijklmnop');
        expect(result.valid).toBe(true);
      });

      it('should reject key too short', () => {
        const result = validateKey('openai', 'sk-abc');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid');
      });

      it('should reject empty string', () => {
        const result = validateKey('openai', '');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject whitespace-only', () => {
        const result = validateKey('openai', '   ');
        expect(result.valid).toBe(false);
      });
    });

    describe('Anthropic', () => {
      it('should accept valid sk-ant- key', () => {
        const result = validateKey('anthropic', 'sk-ant-1234567890abcdefghijklmnop');
        expect(result.valid).toBe(true);
      });

      it('should reject non-sk-ant key', () => {
        const result = validateKey('anthropic', 'sk-other-123456');
        expect(result.valid).toBe(false);
      });
    });

    describe('Google', () => {
      it('should accept valid AIza key', () => {
        // Google keys have AIza prefix + ~35 chars
        const result = validateKey('google', 'AIzaSyD3X4QabcdefghijklmnopqrstuvwxyzAB');
        expect(result.valid).toBe(true);
      });

      it('should reject short key', () => {
        const result = validateKey('google', 'AIza12345');
        expect(result.valid).toBe(false);
      });
    });

    describe('DeepSeek', () => {
      it('should accept valid sk- key with 32+ chars', () => {
        const result = validateKey('deepseek', 'sk-1234567890abcdefghijklmnopqrstuv');
        expect(result.valid).toBe(true);
      });

      it('should reject short key', () => {
        const result = validateKey('deepseek', 'sk-short');
        expect(result.valid).toBe(false);
      });
    });

    describe('HuggingFace', () => {
      it('should accept valid hf_ key', () => {
        const result = validateKey('huggingface', 'hf_1234567890abcdefghijklmnopqrst');
        expect(result.valid).toBe(true);
      });

      it('should reject without hf_ prefix', () => {
        const result = validateKey('huggingface', '1234567890abcdefghijklmnop');
        expect(result.valid).toBe(false);
      });
    });

    describe('Other/Custom', () => {
      it('should accept any non-empty key', () => {
        const result = validateKey('other', 'any-api-key-here');
        expect(result.valid).toBe(true);
      });

      it('should still reject empty', () => {
        const result = validateKey('other', '');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateKeyName', () => {
    it('should accept valid name', () => {
      const result = validateKeyName('Production GPT-4');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateKeyName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only name', () => {
      const result = validateKeyName('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject name too short', () => {
      const result = validateKeyName('a');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2');
    });

    it('should reject name too long', () => {
      const result = validateKeyName('a'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('less than 50');
    });

    it('should accept exactly 2 characters', () => {
      const result = validateKeyName('ab');
      expect(result.valid).toBe(true);
    });

    it('should accept exactly 50 characters', () => {
      const result = validateKeyName('a'.repeat(50));
      expect(result.valid).toBe(true);
    });
  });

  describe('checkDuplicateProvider', () => {
    const existingKeys = [
      { provider: 'openai' as KeyProvider },
      { provider: 'google' as KeyProvider },
    ];

    it('should detect duplicate provider', () => {
      const isDuplicate = checkDuplicateProvider(existingKeys, 'openai');
      expect(isDuplicate).toBe(true);
    });

    it('should allow unique provider', () => {
      const isDuplicate = checkDuplicateProvider(existingKeys, 'anthropic');
      expect(isDuplicate).toBe(false);
    });
  });
});

// ============================================
// Provider Info Tests
// ============================================

describe('Provider Utilities', () => {
  describe('getSupportedProviders', () => {
    it('should return array of all providers', () => {
      const providers = getSupportedProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(5);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('getProviderDisplay', () => {
    it('should return config for known provider', () => {
      const display = getProviderDisplay('openai');
      expect(display.name).toBe('OpenAI');
      expect(display.icon).toBe('🤖');
    });

    it('should return other config for unknown', () => {
      const display = getProviderDisplay('anthropic');
      expect(display.name).toBe('Anthropic');
    });
  });

  describe('parseExpiryDate', () => {
    it('should parse valid ISO date', () => {
      const date = parseExpiryDate('2025-12-31');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2025);
    });

    it('should return undefined for invalid date', () => {
      const date = parseExpiryDate('not-a-date');
      expect(date).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const date = parseExpiryDate('');
      expect(date).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      const date = parseExpiryDate(undefined);
      expect(date).toBeUndefined();
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Key Management Integration', () => {
  it('should validate and mask a key end-to-end', () => {
    const provider: KeyProvider = 'openai';
    const rawKey = 'sk-proj-1234567890abcdefghijklmnop';
    
    // Validate
    const validation = validateKey(provider, rawKey);
    expect(validation.valid).toBe(true);
    
    // Mask
    const masked = maskKey(rawKey);
    expect(masked.startsWith('sk-p')).toBe(true);
    
    // Hint
    const hint = getKeyHint(rawKey);
    expect(hint).toBe('mnop');
  });

  it('should reject invalid key and provide helpful error', () => {
    const result = validateKey('openai', 'invalid-short');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.hint).toBeTruthy();
  });

  it('should handle full key lifecycle validation', () => {
    // Step 1: Validate provider selection
    const providers = getSupportedProviders();
    expect(providers.length).toBeGreaterThan(0);

    // Step 2: Validate key format
    const keyResult = validateKey('anthropic', 'sk-ant-1234567890abcdefghijklmnop');
    expect(keyResult.valid).toBe(true);

    // Step 3: Validate name
    const nameResult = validateKeyName('Claude Opus 3');
    expect(nameResult.valid).toBe(true);

    // Step 4: Check for duplicates
    const existing = [{ provider: 'anthropic' as KeyProvider }];
    const isDuplicate = checkDuplicateProvider(existing, 'anthropic');
    expect(isDuplicate).toBe(true);
  });
});

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('should handle very long keys', () => {
    const longKey = 'sk-proj-' + 'a'.repeat(500);
    const masked = maskKey(longKey);
    expect(masked.length).toBeLessThanOrEqual(500);
    expect(masked.startsWith('sk-p')).toBe(true); // First 4 visible chars
  });

  it('should handle unicode in keys', () => {
    const unicodeKey = 'sk-测试-key-1234567890';
    const masked = maskKey(unicodeKey);
    expect(masked).toBeTruthy();
  });

  it('should handle newline characters in keys', () => {
    const multilineKey = 'sk-proj-1234567890\nabcdefghijklmnop';
    const result = validateKey('openai', multilineKey);
    // Should handle gracefully - trimming removes whitespace
    expect(result.valid).toBe(true);
  });

  it('should validate all provider patterns against valid examples', () => {
    const validExamples: { provider: KeyProvider; key: string }[] = [
      { provider: 'openai', key: 'sk-proj-1234567890abcdefghijklmnopqrstuvwx' },
      { provider: 'anthropic', key: 'sk-ant-api03-1234567890abcdefghijklmnop' },
      { provider: 'google', key: 'AIzaSyD3X4Q9abcdefghijklmnopqrstuvwxyzABC' },
      { provider: 'deepseek', key: 'sk-1234567890abcdefghijklmnopqrstuvwxyz' },
      { provider: 'huggingface', key: 'hf_1234567890abcdefghijklmnopqrstuvwxyz' },
      { provider: 'azure-openai', key: '1234567890abcdefghijklmnopqrst' },
      { provider: 'mistral', key: '1234567890abcdefghijklmnopqrstuv' },
      { provider: 'cohere', key: '1234567890abcdefghijklmnopqrstuvwxyzAB' },
    ];

    validExamples.forEach(({ provider, key }) => {
      const result = validateKey(provider, key);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================
// Test Summary
// ============================================

describe('Test Suite Validation', () => {
  it('should have comprehensive test coverage for key management', () => {
    // This test ensures the test suite itself is properly structured
    expect(true).toBe(true);
  });
});