/**
 * useCalculatorKeyboard Hook
 * 
 * Custom hook for keyboard event handling.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { Operation } from '../types/Calculator';

interface UseCalculatorKeyboardProps {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperation: (operation: Operation) => void;
  onExponent?: () => void;
  onEquals: () => void;
  onClear: () => void;
  onPercentage: () => void;
  onToggleSign: () => void;
  onBackspace?: () => void;
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * useCalculatorKeyboard hook
 * 
 * Handles keyboard input for the calculator.
 */
export function useCalculatorKeyboard({
  onDigit,
  onDecimal,
  onOperation,
  onExponent,
  onEquals,
  onClear,
  onPercentage,
  onToggleSign,
  onBackspace,
  containerRef,
}: UseCalculatorKeyboardProps) {
  // Store handlers in ref to avoid effect re-runs
  const handlersRef = useRef({
    onDigit,
    onDecimal,
    onOperation,
    onExponent: onExponent ?? (() => {}),
    onEquals,
    onClear,
    onPercentage,
    onToggleSign,
    onBackspace: onBackspace ?? (() => {}),
  });

  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = {
      onDigit,
      onDecimal,
      onOperation,
      onExponent: onExponent ?? (() => {}),
      onEquals,
      onClear,
      onPercentage,
      onToggleSign,
      onBackspace: onBackspace ?? (() => {}),
    };
  }, [onDigit, onDecimal, onOperation, onExponent, onEquals, onClear, onPercentage, onToggleSign, onBackspace]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;

    // Number keys (0-9)
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      handlersRef.current.onDigit(key);
      return;
    }

    // Decimal point
    if (key === '.') {
      event.preventDefault();
      handlersRef.current.onDecimal();
      return;
    }

    // Exponent (power) operation
    if (key === '^') {
      event.preventDefault();
      handlersRef.current.onExponent();
      return;
    }

    // Backspace
    if (key === 'Backspace') {
      event.preventDefault();
      handlersRef.current.onBackspace();
      return;
    }

    // Delete key - clear all
    if (key === 'Delete') {
      event.preventDefault();
      handlersRef.current.onClear();
      return;
    }

    // Operators
    switch (key) {
      case '+':
        event.preventDefault();
        handlersRef.current.onOperation('+');
        break;
      case '-':
        event.preventDefault();
        handlersRef.current.onOperation('-');
        break;
      case '*':
        event.preventDefault();
        handlersRef.current.onOperation('×');
        break;
      case '/':
        event.preventDefault();
        // Check for divide symbol
        if (!event.shiftKey) {
          handlersRef.current.onOperation('÷');
        }
        break;
      case '%':
        event.preventDefault();
        handlersRef.current.onPercentage();
        break;
      case '=':
      case 'Enter':
        event.preventDefault();
        handlersRef.current.onEquals();
        break;
      case 'Escape':
      case 'c':
      case 'C':
        event.preventDefault();
        handlersRef.current.onClear();
        break;
    }
  }, []);

  useEffect(() => {
    const target = containerRef?.current ?? document;

    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, containerRef]);
}