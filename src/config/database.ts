import { config } from './index';

// Mock PrismaClient since it's not installed in this environment
class MockPrismaClient {
  constructor(options?: any) {
    console.log('[MockPrisma] Initialized', options);
  }
  
  $connect() { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
}

let prisma: any;

declare global {
  var __prisma: any | undefined;
}

// Prevent multiple instances during hot reload in development
if (config.isDevelopment && global.__prisma) {
  prisma = global.__prisma;
} else {
  prisma = new MockPrismaClient({
    log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  
  if (config.isDevelopment) {
    global.__prisma = prisma;
  }
}

export { prisma };