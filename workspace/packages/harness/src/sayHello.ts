/**
 * Logs a greeting message to the console.
 * 
 * @param name - Optional name to personalize the greeting. Defaults to "World"
 * 
 * @example
 * sayHello()         // logs "Hello, World!"
 * sayHello("Alice")  // logs "Hello, Alice!"
 */
export function sayHello(name: string = "World"): void {
  console.log(`Hello, ${name}!`);
}

// Main execution for direct running
if (require.main === module) {
  sayHello();
}