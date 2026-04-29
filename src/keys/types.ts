/**
 * Key Management Types
 * BYOK (Bring Your Own Key) system types
 */

export type KeyProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'deepseek' 
  | 'azure-openai'
  | 'mistral'
  | 'cohere'
  | 'huggingface'
  | 'other';

export interface ApiKey {
  id: string;
  user_id: string;
  provider: KeyProvider;
  name: string; // User-friendly name like "Production GPT-4"
  masked_key: string; // e.g., "sk-••••••••••••abcd"
  key_hint: string; // Last 4 chars for verification
  status: 'active' | 'expired' | 'invalid';
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  last_used_at?: Date;
  is_default?: boolean;
}

export interface AddKeyRequest {
  provider: KeyProvider;
  name: string;
  api_key: string;
  expires_at?: string;
  is_default?: boolean;
}

export interface AddKeyResponse {
  success: boolean;
  key?: ApiKey;
  error?: string;
}

export interface KeyListResponse {
  keys: ApiKey[];
  total: number;
}

export interface KeyValidationResult {
  valid: boolean;
  error?: string;
  hint?: string;
}

// Provider configuration
export const PROVIDER_CONFIG: Record<KeyProvider, {
  name: string;
  icon: string;
  patterns: RegExp[];
  placeholder: string;
  docs_url: string;
}> = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    patterns: [/^sk-[A-Za-z0-9-]{20,}$/],
    placeholder: 'sk-proj-...',
    docs_url: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    patterns: [/^sk-ant-[A-Za-z0-9-]{20,}$/],
    placeholder: 'sk-ant-...',
    docs_url: 'https://console.anthropic.com/settings/keys',
  },
  google: {
    name: 'Google AI',
    icon: '🔵',
    patterns: [/^AIza[A-Za-z0-9_-]{35}$/],
    placeholder: 'AIza...',
    docs_url: 'https://aistudio.google.com/app/apikey',
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🌊',
    patterns: [/^sk-[A-Za-z0-9]{32,}$/],
    placeholder: 'sk-...',
    docs_url: 'https://platform.deepseek.com/api_keys',
  },
  'azure-openai': {
    name: 'Azure OpenAI',
    icon: '☁️',
    patterns: [/^[A-Za-z0-9]{20,}$/],
    placeholder: 'Azure API Key',
    docs_url: 'https://learn.microsoft.com/azure/ai-services/openai/quickstart',
  },
  mistral: {
    name: 'Mistral',
    icon: '🌬️',
    patterns: [/^[A-Za-z0-9]{20,}$/],
    placeholder: 'Mistral API Key',
    docs_url: 'https://console.mistral.ai/api-keys/',
  },
  cohere: {
    name: 'Cohere',
    icon: '🌐',
    patterns: [/^[A-Za-z0-9]{30,}$/],
    placeholder: 'Cohere API Key',
    docs_url: 'https://dashboard.cohere.com/api-keys',
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    patterns: [/^hf_[A-Za-z0-9]{20,}$/],
    placeholder: 'hf_...',
    docs_url: 'https://huggingface.co/settings/tokens',
  },
  other: {
    name: 'Other (OpenAI Compatible)',
    icon: '🔑',
    patterns: [/^.+$/],
    placeholder: 'API Key',
    docs_url: 'https://platform.openai.com/docs/api-reference',
  },
};

// Mask key for display
export function maskKey(key: string, visibleChars = 4): string {
  if (key.length <= visibleChars) {
    return '•'.repeat(key.length);
  }
  const visible = key.slice(0, visibleChars);
  const masked = '•'.repeat(Math.min(key.length - visibleChars, 20));
  return `${visible}${masked}`;
}

// Get last N characters for verification hint
export function getKeyHint(key: string, chars = 4): string {
  if (key.length < chars) return maskKey(key);
  return key.slice(-chars);
}