import { describe, it, expect, spyOn } from "bun:test";
import { sayHello } from "./sayHello";

describe("sayHello function", () => {
  it("should log 'Hello, World!' when no name is provided", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    
    sayHello();
    
    expect(consoleSpy).toHaveBeenCalledWith("Hello, World!");
    consoleSpy.mockRestore();
  });

  it("should log personalized greeting when name is provided", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    
    sayHello("Alice");
    
    expect(consoleSpy).toHaveBeenCalledWith("Hello, Alice!");
    consoleSpy.mockRestore();
  });

  it("should handle empty string gracefully", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    
    sayHello("");
    
    expect(consoleSpy).toHaveBeenCalledWith("Hello, !");
    consoleSpy.mockRestore();
  });

  it("should use default parameter value", () => {
    const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    
    sayHello("World");
    
    expect(consoleSpy).toHaveBeenCalledWith("Hello, World!");
    consoleSpy.mockRestore();
  });
});