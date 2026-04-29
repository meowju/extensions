/**
 * Calculator Component Tests
 *
 * Tests cover:
 * - Basic rendering
 * - User interactions (button clicks, keyboard)
 * - Arithmetic operations
 * - Error handling
 * - Accessibility attributes
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Calculator, CalculatorButton } from './Calculator';

// Helper to render calculator
function renderCalculator() {
  return render(<Calculator data-testid="calculator" />);
}

// Helper to get buttons
const getButton = (label: string) => {
  return screen.getByRole('button', { name: label });
};

const getDisplay = () => screen.getByTestId('calculator-value');

describe('Calculator Component', () => {
  describe('Rendering', () => {
    it('renders calculator display', () => {
      renderCalculator();
      expect(getDisplay()).toBeInTheDocument();
    });

    it('displays initial value of 0', () => {
      renderCalculator();
      expect(getDisplay()).toHaveTextContent('0');
    });

    it('renders all number buttons (0-9)', () => {
      renderCalculator();
      for (let i = 0; i <= 9; i++) {
        expect(getButton(String(i))).toBeInTheDocument();
      }
    });

    it('renders operator buttons', () => {
      renderCalculator();
      expect(getButton('÷')).toBeInTheDocument();
      expect(getButton('×')).toBeInTheDocument();
      expect(getButton('-')).toBeInTheDocument();
      expect(getButton('+')).toBeInTheDocument();
    });

    it('renders function buttons', () => {
      renderCalculator();
      expect(getButton('C')).toBeInTheDocument();
      expect(getButton('±')).toBeInTheDocument();
      expect(getButton('%')).toBeInTheDocument();
      expect(getButton('=')).toBeInTheDocument();
    });

    it('has correct role and aria-label', () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');
      expect(calculator).toHaveAttribute('role', 'application');
      expect(calculator).toHaveAttribute('aria-label', 'Calculator');
    });
  });

  describe('Basic Arithmetic', () => {
    it('performs addition: 5 + 3 = 8', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
      });
      await act(async () => {
        fireEvent.click(getButton('+'));
      });
      await act(async () => {
        fireEvent.click(getButton('3'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('8');
    });

    it('performs subtraction: 10 - 4 = 6', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('1'));
        fireEvent.click(getButton('0'));
      });
      await act(async () => {
        fireEvent.click(getButton('-'));
      });
      await act(async () => {
        fireEvent.click(getButton('4'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('6');
    });

    it('performs multiplication: 6 × 7 = 42', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('6'));
      });
      await act(async () => {
        fireEvent.click(getButton('×'));
      });
      await act(async () => {
        fireEvent.click(getButton('7'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('42');
    });

    it('performs division: 20 ÷ 4 = 5', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('0'));
      });
      await act(async () => {
        fireEvent.click(getButton('÷'));
      });
      await act(async () => {
        fireEvent.click(getButton('4'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('5');
    });

    it('handles decimal numbers: 1.5 + 2.5 = 4', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('1'));
        fireEvent.click(getButton('.'));
        fireEvent.click(getButton('5'));
      });
      await act(async () => {
        fireEvent.click(getButton('+'));
      });
      await act(async () => {
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('.'));
        fireEvent.click(getButton('5'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('4');
    });
  });

  describe('Chained Operations', () => {
    it('chains multiple operations: 5 + 3 - 2 = 6', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('+'));
        fireEvent.click(getButton('3'));
        fireEvent.click(getButton('-'));
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('6');
    });

    it('continues calculation after equals', async () => {
      renderCalculator();

      // 5 + 3 = 8
      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('+'));
        fireEvent.click(getButton('3'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('8');

      // 8 + 2 = 10
      await act(async () => {
        fireEvent.click(getButton('+'));
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('10');
    });
  });

  describe('Clear Functionality', () => {
    it('clears all values with C button', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('+'));
        fireEvent.click(getButton('3'));
      });

      expect(getDisplay()).toHaveTextContent('3');

      await act(async () => {
        fireEvent.click(getButton('C'));
      });

      expect(getDisplay()).toHaveTextContent('0');
    });
  });

  describe('Sign Toggle', () => {
    it('toggles positive to negative', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('±'));
      });

      expect(getDisplay()).toHaveTextContent('-5');
    });

    it('toggles negative to positive', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('±'));
        fireEvent.click(getButton('±'));
      });

      expect(getDisplay()).toHaveTextContent('5');
    });
  });

  describe('Percentage', () => {
    it('converts to percentage: 50% = 0.5', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('%'));
      });

      expect(getDisplay()).toHaveTextContent('0.5');
    });

    it('calculates percentage of number: 20% of 100 = 20', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('1'));
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('0'));
      });
      await act(async () => {
        fireEvent.click(getButton('×'));
      });
      await act(async () => {
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('0'));
      });
      await act(async () => {
        fireEvent.click(getButton('%'));
      });
      await act(async () => {
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('20');
    });
  });

  describe('Error Handling', () => {
    it('displays Error for division by zero', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('÷'));
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('Error');
    });

    it('allows new calculation after error', async () => {
      renderCalculator();

      // Division by zero
      await act(async () => {
        fireEvent.click(getButton('5'));
        fireEvent.click(getButton('÷'));
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('Error');

      // Clear and start new calculation
      await act(async () => {
        fireEvent.click(getButton('C'));
      });
      await act(async () => {
        fireEvent.click(getButton('1'));
        fireEvent.click(getButton('+'));
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('='));
      });

      expect(getDisplay()).toHaveTextContent('3');
    });
  });

  describe('Input Edge Cases', () => {
    it('prevents multiple leading zeros', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('0'));
        fireEvent.click(getButton('0'));
      });

      expect(getDisplay()).toHaveTextContent('0');
    });

    it('prevents multiple decimal points', async () => {
      renderCalculator();

      await act(async () => {
        fireEvent.click(getButton('1'));
        fireEvent.click(getButton('.'));
        fireEvent.click(getButton('2'));
        fireEvent.click(getButton('.'));
        fireEvent.click(getButton('3'));
      });

      expect(getDisplay()).toHaveTextContent('1.23');
    });

    it('limits digits to 12', async () => {
      renderCalculator();

      for (let i = 0; i < 15; i++) {
        await act(async () => {
          fireEvent.click(getButton(String(i % 10)));
        });
      }

      const value = getDisplay().textContent || '';
      expect(value.replace('.', '').replace('-', '').length).toBeLessThanOrEqual(12);
    });
  });

  describe('Keyboard Support', () => {
    it('handles number keys', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      await act(async () => {
        fireEvent.keyDown(calculator, { key: '5' });
      });

      expect(getDisplay()).toHaveTextContent('5');
    });

    it('handles decimal key', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      await act(async () => {
        fireEvent.keyDown(calculator, { key: '1' });
        fireEvent.keyDown(calculator, { key: '.' });
        fireEvent.keyDown(calculator, { key: '5' });
      });

      expect(getDisplay()).toHaveTextContent('1.5');
    });

    it('handles operation keys', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      await act(async () => {
        fireEvent.keyDown(calculator, { key: '5' });
        fireEvent.keyDown(calculator, { key: '+' });
        fireEvent.keyDown(calculator, { key: '3' });
        fireEvent.keyDown(calculator, { key: '=' });
      });

      expect(getDisplay()).toHaveTextContent('8');
    });

    it('handles multiply and divide with keyboard', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      // 6 * 2 = 12
      await act(async () => {
        fireEvent.keyDown(calculator, { key: '6' });
        fireEvent.keyDown(calculator, { key: '*' });
        fireEvent.keyDown(calculator, { key: '2' });
        fireEvent.keyDown(calculator, { key: '=' });
      });

      expect(getDisplay()).toHaveTextContent('12');

      // 12 / 3 = 4
      await act(async () => {
        fireEvent.keyDown(calculator, { key: '/' });
        fireEvent.keyDown(calculator, { key: '3' });
        fireEvent.keyDown(calculator, { key: '=' });
      });

      expect(getDisplay()).toHaveTextContent('4');
    });

    it('handles Enter key as equals', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      await act(async () => {
        fireEvent.keyDown(calculator, { key: '5' });
        fireEvent.keyDown(calculator, { key: '+' });
        fireEvent.keyDown(calculator, { key: '3' });
        fireEvent.keyDown(calculator, { key: 'Enter' });
      });

      expect(getDisplay()).toHaveTextContent('8');
    });

    it('handles Escape key as clear', async () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      await act(async () => {
        fireEvent.keyDown(calculator, { key: '5' });
        fireEvent.keyDown(calculator, { key: '0' });
        fireEvent.keyDown(calculator, { key: 'Escape' });
      });

      expect(getDisplay()).toHaveTextContent('0');
    });
  });

  describe('Accessibility', () => {
    it('buttons have aria-labels', () => {
      renderCalculator();

      expect(getButton('÷')).toHaveAttribute('aria-label', 'Divide');
      expect(getButton('×')).toHaveAttribute('aria-label', 'Multiply');
      expect(getButton('±')).toHaveAttribute('aria-label', 'Toggle sign');
      expect(getButton('%')).toHaveAttribute('aria-label', 'Calculate percentage');
    });

    it('display has aria-live for screen readers', () => {
      renderCalculator();
      const display = getDisplay();
      expect(display).toHaveAttribute('aria-live', 'polite');
    });

    it('calculator is focusable', () => {
      renderCalculator();
      const calculator = screen.getByTestId('calculator');

      act(() => {
        calculator.focus();
      });

      expect(document.activeElement).toBe(calculator);
    });

    it('buttons are not disabled during normal operation', () => {
      renderCalculator();

      const numberButtons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      numberButtons.forEach((num) => {
        expect(getButton(num)).not.toBeDisabled();
      });
    });
  });
});

describe('CalculatorButton Component', () => {
  it('renders with label', () => {
    render(<CalculatorButton label="5" onClick={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<CalculatorButton label="5" onClick={onClick} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<CalculatorButton label="5" onClick={onClick} disabled />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies correct variant class', () => {
    const { rerender } = render(
      <CalculatorButton label="5" onClick={vi.fn()} variant="number" />
    );
    expect(screen.getByRole('button')).toHaveClass('calculator__button--number');

    rerender(<CalculatorButton label="+" onClick={vi.fn()} variant="operator" />);
    expect(screen.getByRole('button')).toHaveClass('calculator__button--operator');

    rerender(<CalculatorButton label="C" onClick={vi.fn()} variant="function" />);
    expect(screen.getByRole('button')).toHaveClass('calculator__button--function');
  });

  it('uses custom aria-label when provided', () => {
    render(<CalculatorButton label="5" onClick={vi.fn()} aria-label="Five" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Five');
  });
});

describe('Calculator Display', () => {
  it('shows expression in expression area', async () => {
    renderCalculator();

    await act(async () => {
      fireEvent.click(getButton('5'));
      fireEvent.click(getButton('+'));
    });

    const expression = screen.getByTestId('calculator-expression');
    expect(expression).toHaveTextContent('5 +');
  });

  it('shows full expression after equals', async () => {
    renderCalculator();

    await act(async () => {
      fireEvent.click(getButton('5'));
      fireEvent.click(getButton('+'));
      fireEvent.click(getButton('3'));
      fireEvent.click(getButton('='));
    });

    const expression = screen.getByTestId('calculator-expression');
    expect(expression).toHaveTextContent('5 + 3 =');
  });
});
