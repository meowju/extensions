# Mission #27: Test Suite Recovery

## Objective
Fix broken test suite and restore all tests to passing state.

## Root Causes

### 1. Orphaned Harness Directory
- `workspace/packages/harness/` contains broken tests referencing deleted modules
- These tests run during `bun test` causing hangs/failures
- **Fix**: Delete the entire directory

### 2. Calculator Edge Case Failures (16 tests)

#### 2.1 Tokenizer Missing `!` (Factorial)
**Location**: `src/calculator-canonical.ts`
**Issue**: Tokenizer throws "Unexpected character: !" for expressions like `5!`
**Fix**: Add `!` as valid token (or handle as postfix operator)

#### 2.2 Tokenizer Missing Scientific Notation (`e`)
**Location**: `src/calculator-canonical.ts`
**Issue**: Tokenizer throws "Unexpected character: 'e'" for `1e5`, `1e-10`
**Fix**: Handle `e`/`E` in numeric parsing (with optional sign)

#### 2.3 Memory State Persistence
**Issue**: `memoryStore()` followed by `clearAll()` then `memoryRecall()` returns 0 instead of stored value
**Fix**: Ensure memory survives `clearAll()`

#### 2.4 History Limit Enforcement
**Issue**: History grows beyond 50 entries
**Fix**: Enforce `MAX_HISTORY = 50` limit

#### 2.5 Missing API Methods
**Issue**: `evaluateSafe()` and `Calculator.calculate()` static methods missing
**Fix**: Add these convenience methods

## Implementation Plan

### Phase 1: Remove Orphaned Harness
```bash
rm -rf workspace/packages/harness/
```

### Phase 2: Fix Tokenizer
Update tokenizer to handle:
- `!` (factorial) as postfix operator
- `e`/`E` in numbers for scientific notation

### Phase 3: Fix State Management
- Memory should survive `clearAll()`
- History should enforce MAX_HISTORY limit

### Phase 4: Add Missing API Methods
- `Calculator.calculate(expression)` - static throw-on-error
- `calculator.evaluateSafe(expression)` - returns Result

## Validation Criteria
1. All 103 calculator edge-case tests pass
2. Full `bun test` completes in <30 seconds
3. No orphaned test directories
