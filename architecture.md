# Architecture: CSS Variables Unification (V3.6 Follow-up)

## GOAL
Refactor `Calculator.tsx` to use CSS classes with CSS variables from `Calculator.css` instead of inline styles.

## CURRENT STATE
| File | Issue |
|------|-------|
| `Calculator.css` | ✅ Has CSS variables (`--calc-*`) and BEM classes (`.calculator__button--number`) |
| `Calculator.tsx` | ❌ Uses inline `styles` object with hardcoded hex values |

## ARCHITECTURE

### Approach: CSS Module + BEM Classnames
Replace inline `styles` object with `className` props that map to `.calculator.css` classes.

### Files to Modify
1. `src/components/Calculator.tsx` - Replace `style={...}` with `className="calculator__*"`
2. `src/styles/Calculator.css` - CSS variables already exist, classes already defined

### Key Mappings
| Inline Style | → CSS Class |
|--------------|-------------|
| `styles.container` | `className="calculator"` |
| `styles.display` | `className="calculator__display"` |
| `styles.value` | `className="calculator__value"` |
| `styles.buttonGrid` | `className="calculator__grid"` |
| `styles.button` | `className="calculator__button"` |
| `styles.numberButton` | `className="calculator__button calculator__button--number"` |
| `styles.operatorButton` | `className="calculator__button calculator__button--operator"` |
| `styles.functionButton` | `className="calculator__button calculator__button--function"` |
| `styles.equalsButton` | `className="calculator__button calculator__button--equals"` |

### Implementation Steps
1. Remove `styles` constant
2. Add `className` to each JSX element
3. Handle `CalculatorButton` colSpan with conditional class
4. Remove inline `getButtonStyle()` function
5. Keep `aria-*` accessibility attributes

## VALIDATION CRITERIA

### must have
- [ ] Calculator renders with CSS variables (not hardcoded hex)
- [ ] All button types styled correctly (number, operator, function, equals)
- [ ] colSpan 2 works for zero button
- [ ] Accessibility attributes preserved (aria-label, aria-live)
- [ ] No TypeScript errors

### should have
- [ ] Console free of React warnings
- [ ] Responsive styles work (via CSS media queries)

## RISKS
- Low: CSS classes already exist in Calculator.css
- Need to verify component links to CSS file