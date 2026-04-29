/**
 * Calculator UI Module
 * Button layout, display area, styling, and event handling
 */

export { CalculatorUI, createCalculatorUI, DEFAULT_KEYBOARD_MAPPING, type CalculatorUIConfig, type KeyboardMapping } from './CalculatorUI';
export { 
  createButton, 
  createDisplay, 
  createCalculatorContainer,
  BUTTON_LAYOUT,
  getButtonClass,
  type ButtonConfig,
  type ButtonType
} from './elements';
export { 
  attachButtonHandlers, 
  attachKeyboardHandlers,
  attachTouchHandlers 
} from './handlers';

// Re-export calculator core types
export type { DisplayUpdateCallback, CalculationCallback, ErrorCallback } from './CalculatorUI';