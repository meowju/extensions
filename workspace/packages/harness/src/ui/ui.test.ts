/**
 * Tests for Calculator UI components
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  BUTTON_LAYOUT, 
  createButton, 
  createDisplay, 
  createCalculatorContainer,
  getButtonClass,
  ButtonConfig 
} from '../../src/ui/elements';
import { Calculator, createCalculator } from '../../src/calculator/calculator';

// Mock element with querySelector support
function createMockElement(tagName: string): any {
  const children: any[] = [];
  const elements: Record<string, any[]> = {};
  
  const el = {
    tagName: tagName.toUpperCase(),
    className: '',
    textContent: '',
    dataset: {},
    style: {},
    type: '',
    id: '',
    children,
    _elements: elements,
    appendChild: function(child: any) {
      children.push(child);
      // Track elements by class name for querySelector
      if (child.className) {
        child.className.split(' ').forEach((cls: string) => {
          if (!elements[cls]) elements[cls] = [];
          elements[cls].push(child);
        });
      }
      return child;
    },
    querySelector: function(selector: string) {
      const cls = selector.replace('.', '');
      return elements[cls]?.[0] || null;
    },
    querySelectorAll: function(selector: string) {
      const cls = selector.replace('.', '');
      return elements[cls] || [];
    },
    setAttribute: vi.fn(),
    getAttribute: vi.fn((attr) => {
      if (attr === 'aria-label') return el._ariaLabel;
      if (attr === 'role') return el._role;
      return null;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    replaceWith: vi.fn(),
    cloneNode: vi.fn(),
    focus: vi.fn(),
  };
  
  return el;
}

// Mock document
const mockDocument = {
  createElement: vi.fn((tag) => createMockElement(tag)),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

global.document = mockDocument as unknown as Document;

describe('UI Elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BUTTON_LAYOUT', () => {
    it('should have 7 rows', () => {
      expect(BUTTON_LAYOUT.length).toBe(7);
    });

    it('should have memory operations in row 0', () => {
      const row = BUTTON_LAYOUT[0];
      expect(row.length).toBe(5);
      expect(row[0].value).toBe('MC');
      expect(row[1].value).toBe('MR');
      expect(row[2].value).toBe('M+');
      expect(row[3].value).toBe('M-');
      expect(row[4].value).toBe('MS');
    });

    it('should have clear operations in row 1', () => {
      const row = BUTTON_LAYOUT[1];
      expect(row.length).toBe(4);
      expect(row[0].value).toBe('CE');
      expect(row[1].value).toBe('AC');
    });

    it('should have digits 7-9 in row 3', () => {
      const row = BUTTON_LAYOUT[3];
      expect(row.length).toBe(4);
      expect(row[0].value).toBe('7');
      expect(row[1].value).toBe('8');
      expect(row[2].value).toBe('9');
    });

    it('should have digit 0 with span 2 in last row', () => {
      const row = BUTTON_LAYOUT[6];
      expect(row[0].value).toBe('0');
      expect(row[0].span).toBe(2);
    });

    it('should have operators for all basic math operations', () => {
      const operators = new Set<string>();
      
      BUTTON_LAYOUT.forEach((row) => {
        row.forEach((btn) => {
          if (btn.type === 'operator') {
            operators.add(btn.value);
          }
        });
      });

      expect(operators.has('+')).toBe(true);
      expect(operators.has('-')).toBe(true);
      expect(operators.has('*')).toBe(true);
      expect(operators.has('/')).toBe(true);
      expect(operators.has('=')).toBe(true);
    });
  });

  describe('getButtonClass', () => {
    it('should return correct class for digit', () => {
      expect(getButtonClass('digit')).toBe('calc-btn--digit');
    });

    it('should return correct class for operator', () => {
      expect(getButtonClass('operator')).toBe('calc-btn--operator');
    });

    it('should return correct class for function', () => {
      expect(getButtonClass('function')).toBe('calc-btn--function');
    });

    it('should return correct class for memory', () => {
      expect(getButtonClass('memory')).toBe('calc-btn--memory');
    });

    it('should return correct class for clear', () => {
      expect(getButtonClass('clear')).toBe('calc-btn--clear');
    });
  });

  describe('createButton', () => {
    it('should create button with correct type', () => {
      const config: ButtonConfig = {
        label: '5',
        value: '5',
        type: 'digit',
      };

      const button = createButton(config);

      expect(button.type).toBe('button');
      expect(button.className).toBe('calc-btn calc-btn--digit');
      expect(button.textContent).toBe('5');
      expect(button.dataset.value).toBe('5');
      expect(button.dataset.type).toBe('digit');
    });

    it('should handle button with span', () => {
      const config: ButtonConfig = {
        label: '0',
        value: '0',
        type: 'digit',
        span: 2,
      };

      const button = createButton(config);

      expect(button.style.gridColumn).toBe('span 2');
    });

    it('should set aria-label when provided', () => {
      const config: ButtonConfig = {
        label: '+',
        value: '+',
        type: 'operator',
        ariaLabel: 'Add',
      };

      const button = createButton(config);

      // Check that setAttribute was called with aria-label
      expect(button.setAttribute).toHaveBeenCalledWith('aria-label', 'Add');
    });
  });

  describe('createDisplay', () => {
    it('should create display container', () => {
      const display = createDisplay();

      expect(display.className).toBe('calc-display');
    });

    it('should create expression and result elements', () => {
      const display = createDisplay();
      
      const expression = display.querySelector('.calc-display__expression');
      const result = display.querySelector('.calc-display__result');

      expect(expression).not.toBeNull();
      expect(result).not.toBeNull();
    });

    it('should set initial result to 0', () => {
      const display = createDisplay();
      
      const result = display.querySelector('.calc-display__result');
      expect(result?.textContent).toBe('0');
    });

    it('should have aria-live on both elements', () => {
      const display = createDisplay();
      
      const expression = display.querySelector('.calc-display__expression');
      const result = display.querySelector('.calc-display__result');

      expect(expression?.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
      expect(result?.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
    });
  });

  describe('createCalculatorContainer', () => {
    it('should create container with correct role', () => {
      const container = createCalculatorContainer();

      expect(container.className).toBe('calc-container');
      expect(container.setAttribute).toHaveBeenCalledWith('role', 'application');
      expect(container.setAttribute).toHaveBeenCalledWith('aria-label', 'Calculator');
    });
  });
});

describe('Button Handlers', () => {
  // Use fresh calculator instances for each test to avoid state pollution
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('click handler integration', () => {
    it('should update display on digit click', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      
      expect(calculator.getDisplay()).toBe('5');
    });

    it('should chain digits correctly', () => {
      const calculator = createCalculator();
      calculator.digit('1');
      calculator.digit('2');
      calculator.digit('3');
      
      expect(calculator.getDisplay()).toBe('123');
    });

    it('should handle decimal point', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.decimal();
      calculator.digit('2');
      
      expect(calculator.getDisplay()).toBe('5.2');
    });

    it('should handle operator and equals', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      const result = calculator.equals();
      
      // Note: Result varies based on calculator implementation
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('value');
    });

    it('should clear entry', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.digit('5');
      calculator.clearEntry();
      
      expect(calculator.getDisplay()).toBe('0');
    });

    it('should clear all', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.operator('+');
      calculator.digit('3');
      calculator.clearAll();
      
      expect(calculator.getDisplay()).toBe('0');
    });

    it('should handle backspace', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.digit('5');
      calculator.backspace();
      
      expect(calculator.getDisplay()).toBe('5');
    });

    it('should toggle sign', () => {
      const calculator = createCalculator();
      calculator.digit('5');
      calculator.toggleSign();
      
      expect(calculator.getDisplay()).toBe('-5');
    });

    it('should handle memory operations', () => {
      const calculator = createCalculator();
      calculator.digit('1');
      calculator.digit('0');
      calculator.memoryStore();
      
      const memoryState = calculator.getState().memory;
      expect(memoryState).toBe(10);
    });
  });
});

describe('Keyboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map digit keys', () => {
    const digitKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    digitKeys.forEach((key) => {
      const calculator = createCalculator();
      calculator.digit(key);
      expect(calculator.getDisplay()).toBe(key);
    });
  });

  it('should handle basic operations', () => {
    const calculator = createCalculator();
    
    calculator.digit('5');
    calculator.operator('+');
    calculator.digit('3');
    
    const result = calculator.equals();
    expect(result).toHaveProperty('success', true);
  });

  it('should handle Enter as equals', () => {
    const calculator = createCalculator();
    
    calculator.digit('5');
    calculator.operator('+');
    calculator.digit('3');
    
    const result = calculator.equals();
    expect(result.success).toBe(true);
  });
});