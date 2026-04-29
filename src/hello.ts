/**
 * Hello function module
 * Provides greeting functionality with both print and return options
 */

export interface HelloOptions {
  /** Print the greeting to console */
  print?: boolean;
  /** Custom name to greet (default: "World") */
  name?: string;
}

export interface HelloResult {
  /** The greeting message */
  message: string;
  /** The name that was greeted */
  name: string;
}

/**
 * Generate a greeting message or print it to console.
 *
 * @param options - Configuration options
 * @param options.print - If true, prints the greeting to console
 * @param options.name - The name to greet (default: "World")
 * @returns An object containing the greeting message and the name
 *
 * @example
 * // Returns greeting without printing
 * const result = hello();
 * // result.message === "Hello, World!"
 *
 * @example
 * // Prints greeting to console
 * hello({ print: true });
 *
 * @example
 * // Custom name with print
 * hello({ name: "Alice", print: true });
 */
export function hello(options: HelloOptions = {}): HelloResult {
  const { print = false, name = "World" } = options;
  const message = `Hello, ${name}!`;

  if (print) {
    console.log(message);
  }

  return { message, name };
}

// Default export for convenience
export default hello;