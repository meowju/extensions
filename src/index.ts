// Main entry point for the TypeScript project

export interface ProjectConfig {
  name: string;
  version: string;
  environment: string;
}

export function createConfig(config: Partial<ProjectConfig>): ProjectConfig {
  return {
    name: config.name ?? 'default-project',
    version: config.version ?? '1.0.0',
    environment: config.environment ?? 'development',
  };
}

export function greet(name: string): string {
  return `Hello, ${name}! Welcome to TypeScript.`;
}

// Main execution
const config = createConfig({ name: 'My Project' });
console.log(greet('Developer'));
console.log(`Project: ${config.name} v${config.version}`);
