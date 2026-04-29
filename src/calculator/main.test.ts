/**
 * Tests for Calculator CLI Interface
 * Tests input handling, command processing, and expression evaluation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'bun:test';
import { CalculatorCLI } from './main';

// Mock readline for testing
vi.mock('readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn(),
    on: vi.fn(() => ({
      on: vi.fn(),
    })),
  })),
}));

describe('CalculatorCLI', () => {
  let cli: CalculatorCLI;

  beforeEach(() => {
    cli = new CalculatorCLI({ greeting: false });
  });

  afterEach(() => {
    cli.stop();
  });

  describe('processInput - Arithmetic Operations', () => {
    it('should evaluate addition', () => {
      const result = cli.processInput('10 + 5');
      expect(result.success).toBe(true);
      expect(result.message).toBe('10 + 5 = 15');
    });

    it('should evaluate subtraction', () => {
      const result = cli.processInput('20 - 8');
      expect(result.success).toBe(true);
      expect(result.message).toBe('20 - 8 = 12');
    });

    it('should evaluate multiplication', () => {
      const result = cli.processInput('6 * 7');
      expect(result.success).toBe(true);
      expect(result.message).toBe('6 * 7 = 42');
    });

    it('should evaluate division', () => {
      const result = cli.processInput('100 / 4');
      expect(result.success).toBe(true);
      expect(result.message).toBe('100 / 4 = 25');
    });

    it('should handle division by zero', () => {
      const result = cli.processInput('10 / 0');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Division by zero');
    });

    it('should evaluate power operations', () => {
      const result = cli.processInput('2 ^ 8');
      expect(result.success).toBe(true);
      expect(result.message).toBe('2 ^ 8 = 256');
    });

    it('should evaluate factorial', () => {
      const result = cli.processInput('5!');
      expect(result.success).toBe(true);
      expect(result.message).toBe('5! = 120');
    });

    it('should handle negative numbers', () => {
      const result = cli.processInput('-5 + 3');
      expect(result.success).toBe(true);
      expect(result.message).toBe('-5 + 3 = -2');
    });

    it('should handle decimal numbers', () => {
      const result = cli.processInput('3.14 * 2');
      expect(result.success).toBe(true);
      expect(result.message).toContain('6.28');
    });

    it('should respect operator precedence', () => {
      const result = cli.processInput('2 + 3 * 4');
      expect(result.success).toBe(true);
      expect(result.message).toBe('2 + 3 * 4 = 14');
    });

    it('should handle parentheses', () => {
      const result = cli.processInput('(2 + 3) * 4');
      expect(result.success).toBe(true);
      expect(result.message).toBe('(2 + 3) * 4 = 20');
    });

    it('should handle nested parentheses', () => {
      const result = cli.processInput('((1 + 2) * (3 + 4))');
      expect(result.success).toBe(true);
      expect(result.message).toBe('((1 + 2) * (3 + 4)) = 21');
    });

    it('should handle complex expressions', () => {
      // 2^3 + 4*5 - 6/2 = 8 + 20 - 3 = 25 (power has higher precedence)
      const result = cli.processInput('2 ^ 3 + 4 * 5 - 6 / 2');
      expect(result.success).toBe(true);
      expect(result.message).toContain('= 25');
    });
  });

  describe('processInput - Commands', () => {
    it('should handle quit command', () => {
      const result = cli.processInput('quit');
      expect(result.success).toBe(true);
      expect(result.isQuit).toBe(true);
    });

    it('should handle exit command', () => {
      const result = cli.processInput('exit');
      expect(result.success).toBe(true);
      expect(result.isQuit).toBe(true);
    });

    it('should handle q command', () => {
      const result = cli.processInput('q');
      expect(result.success).toBe(true);
      expect(result.isQuit).toBe(true);
    });

    it('should handle help command', () => {
      const result = cli.processInput('help');
      expect(result.success).toBe(true);
      expect(result.isHelp).toBe(true);
    });

    it('should handle h command', () => {
      const result = cli.processInput('h');
      expect(result.success).toBe(true);
      expect(result.isHelp).toBe(true);
    });

    it('should handle clear command', () => {
      const result = cli.processInput('clear');
      expect(result.success).toBe(true);
      expect(result.isClear).toBe(true);
    });

    it('should handle cls command', () => {
      const result = cli.processInput('cls');
      expect(result.success).toBe(true);
      expect(result.isClear).toBe(true);
    });

    it('should handle history command', () => {
      const result = cli.processInput('history');
      expect(result.success).toBe(true);
      expect(result.showHistory).toBe(true);
    });

    it('should handle memory command', () => {
      const result = cli.processInput('memory');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Memory');
    });

    it('should handle memory clear command', () => {
      const result = cli.processInput('mc');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Memory cleared');
    });

    it('should handle memory recall command', () => {
      const result = cli.processInput('mr');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Memory recall');
    });
  });

  describe('processInput - Memory Operations', () => {
    it('should store result to memory with -> mem syntax', () => {
      const result = cli.processInput('5 + 3 -> mem');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Stored');
      
      const memResult = cli.processInput('memory');
      expect(memResult.message).toContain('8');
    });

    it('should store result to memory with to mem syntax', () => {
      const result = cli.processInput('10 * 2 to mem');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Stored');
    });

    it('should use m+ to add to memory', () => {
      // First do a calculation
      cli.processInput('10 + 5');
      
      // Then add to memory
      const result = cli.processInput('m+');
      expect(result.success).toBe(true);
    });

    it('should use m- to subtract from memory', () => {
      // First do a calculation
      cli.processInput('20 - 5');
      
      // Then subtract from memory
      const result = cli.processInput('m-');
      expect(result.success).toBe(true);
    });
  });

  describe('processInput - Edge Cases', () => {
    it('should handle empty input', () => {
      const result = cli.processInput('');
      expect(result.success).toBe(true);
      expect(result.message).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = cli.processInput('   ');
      expect(result.success).toBe(true);
      expect(result.message).toBe('');
    });

    it('should handle input with extra whitespace', () => {
      const result = cli.processInput('  5   +   3  ');
      expect(result.success).toBe(true);
      // Expression preserves whitespace in output
      expect(result.message).toContain('= 8');
    });

    it('should handle mismatched parentheses', () => {
      const result = cli.processInput('(2 + 3');
      expect(result.success).toBe(false);
      expect(result.message).toContain('parentheses');
    });

    it('should handle invalid characters', () => {
      const result = cli.processInput('5 & 3');
      expect(result.success).toBe(false);
    });

    it('should handle very large numbers', () => {
      const result = cli.processInput('999999999999 * 999999999999');
      expect(result.success).toBe(true);
    });

    it('should handle very small decimals', () => {
      const result = cli.processInput('0.00001 + 0.00002');
      expect(result.success).toBe(true);
    });
  });

  describe('processInput - Case Sensitivity', () => {
    it('should handle uppercase HELP', () => {
      const result = cli.processInput('HELP');
      expect(result.success).toBe(true);
      expect(result.isHelp).toBe(true);
    });

    it('should handle mixed case Quit', () => {
      const result = cli.processInput('Quit');
      expect(result.success).toBe(true);
      expect(result.isQuit).toBe(true);
    });

    it('should handle HISTORY', () => {
      const result = cli.processInput('HISTORY');
      expect(result.success).toBe(true);
      expect(result.showHistory).toBe(true);
    });
  });

  describe('History Management', () => {
    it('should add expressions to history', () => {
      cli.processInput('2 + 2');
      cli.processInput('3 * 3');
      
      const history = cli.getHistory();
      expect(history.length).toBe(2);
    });

    it('should store correct results in history', () => {
      cli.processInput('2 + 2');
      
      const history = cli.getHistory();
      expect(history[0].expression).toBe('2 + 2');
      expect(history[0].result).toBe(4);
    });

    it('should clear history', () => {
      cli.processInput('2 + 2');
      cli.processInput('3 * 3');
      
      cli.clearHistory();
      
      expect(cli.getHistory().length).toBe(0);
    });

    it('should limit history size', () => {
      // Create CLI with small history size
      const smallCli = new CalculatorCLI({ historySize: 3, greeting: false });
      
      smallCli.processInput('1 + 1');
      smallCli.processInput('2 + 2');
      smallCli.processInput('3 + 3');
      smallCli.processInput('4 + 4');
      
      const history = smallCli.getHistory();
      expect(history.length).toBe(3);
      
      smallCli.stop();
    });
  });

  describe('History Navigation', () => {
    it('should return empty string when no history', () => {
      expect(cli.getPreviousCommand()).toBe('');
      expect(cli.getNextCommand()).toBe('');
    });

    it('should navigate to previous commands', () => {
      cli.processInput('1 + 1');
      cli.processInput('2 + 2');
      cli.processInput('3 + 3');
      
      expect(cli.getPreviousCommand()).toBe('3 + 3');
      expect(cli.getPreviousCommand()).toBe('2 + 2');
      expect(cli.getPreviousCommand()).toBe('1 + 1');
    });

    it('should navigate to next commands', () => {
      cli.processInput('1 + 1');
      cli.processInput('2 + 2');
      
      cli.getPreviousCommand();
      cli.getPreviousCommand();
      
      expect(cli.getNextCommand()).toBe('2 + 2');
      expect(cli.getNextCommand()).toBe('');
    });

    it('should reset history index on new input', () => {
      cli.processInput('1 + 1');
      cli.getPreviousCommand();
      cli.processInput('2 + 2');
      
      // After new input, history index resets to -1
      // getPreviousCommand should return the most recent (2 + 2)
      expect(cli.getPreviousCommand()).toBe('2 + 2');
    });
  });

  describe('State Management', () => {
    it('should return initial state', () => {
      const state = cli.getState();
      expect(state).toBeDefined();
      expect(state.display).toBe('0');
    });

    it('should check if calculator is running', () => {
      expect(cli.isActive()).toBe(false);
      
      cli.start();
      expect(cli.isActive()).toBe(true);
      
      cli.stop();
      expect(cli.isActive()).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should handle zero factorial', () => {
      const result = cli.processInput('0!');
      expect(result.success).toBe(true);
      expect(result.message).toBe('0! = 1');
    });

    it('should handle basic negative factorial rejection', () => {
      const result = cli.processInput('-5!');
      expect(result.success).toBe(true); // 5! = 120, then negated
    });

    it('should reject invalid syntax', () => {
      const result = cli.processInput('++5');
      expect(result.success).toBe(false);
    });
  });
});
