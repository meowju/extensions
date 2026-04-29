/**
 * String utility functions for common text transformations.
 */

/**
 * Capitalizes the first letter of a string.
 * 
 * @param str - The string to capitalize
 * @returns The string with the first character converted to uppercase
 * 
 * @example
 * capitalize("hello")    // returns "Hello"
 * capitalize("world")    // returns "World"
 * capitalize("")         // returns ""
 * capitalize("a")        // returns "A"
 */
export function capitalize(str: string): string {
  if (!str) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to kebab-case.
 * 
 * @param str - The string to convert
 * @returns The string in kebab-case format
 * 
 * @example
 * kebabCase("helloWorld")    // returns "hello-world"
 * kebabCase("Hello World")   // returns "hello-world"
 * kebabCase("__FOO_BAR__")   // returns "foo-bar"
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Checks if a string is empty or contains only whitespace.
 * 
 * @param str - The string to check
 * @returns True if the string is empty or whitespace-only
 * 
 * @example
 * isEmpty("")          // returns true
 * isEmpty("   ")       // returns true
 * isEmpty("hello")     // returns false
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}