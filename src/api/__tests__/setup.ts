import { beforeAll, afterAll } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
const TEST_TIMEOUT = 30000;

beforeAll(() => {
  // Any global setup
});

afterAll(() => {
  // Any global cleanup
});

export { TEST_TIMEOUT };
