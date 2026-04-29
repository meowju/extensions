import { createConfig, greet, ProjectConfig } from './index';

describe('TypeScript Project Tests', () => {
  describe('createConfig', () => {
    it('should create config with default values', () => {
      const config = createConfig({});
      expect(config.name).toBe('default-project');
      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBe('development');
    });

    it('should create config with custom values', () => {
      const config = createConfig({
        name: 'Test Project',
        version: '2.0.0',
        environment: 'production',
      });
      expect(config.name).toBe('Test Project');
      expect(config.version).toBe('2.0.0');
      expect(config.environment).toBe('production');
    });

    it('should allow partial overrides', () => {
      const config = createConfig({ name: 'Partial Project' });
      expect(config.name).toBe('Partial Project');
      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBe('development');
    });
  });

  describe('greet', () => {
    it('should return greeting with name', () => {
      const greeting = greet('Alice');
      expect(greeting).toBe('Hello, Alice! Welcome to TypeScript.');
    });

    it('should handle empty string', () => {
      const greeting = greet('');
      expect(greeting).toBe('Hello, ! Welcome to TypeScript.');
    });

    it('should handle special characters in name', () => {
      const greeting = greet('John Doe');
      expect(greeting).toBe('Hello, John Doe! Welcome to TypeScript.');
    });
  });

  describe('ProjectConfig interface', () => {
    it('should have correct structure', () => {
      const config: ProjectConfig = {
        name: 'Interface Test',
        version: '1.0.0',
        environment: 'test',
      };
      expect(config.name).toBe('Interface Test');
      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBe('test');
    });
  });
});
