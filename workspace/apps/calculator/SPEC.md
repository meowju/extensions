# Calculator - Specification

## Project Overview

- **Project name**: Meow Calculator
- **Type**: CLI tool and API endpoint
- **Core functionality**: Mathematical expression evaluator with support for basic operations, advanced functions, and variable assignments
- **Target users**: Developers, system administrators, interactive shell users

## Technical Stack

- **Runtime**: Bun/TypeScript
- **Architecture**: Standalone evaluator with API wrapper

## Features

### 1. Basic Operations
- [x] Addition (+)
- [x] Subtraction (-)
- [x] Multiplication (*)
- [x] Division (/)
- [x] Modulo (%)

### 2. Advanced Operations
- [x] Exponentiation (^)
- [x] Square root (sqrt)
- [x] Absolute value (abs)
- [x] Parentheses for grouping

### 3. Functions
- [x] Math.sin, Math.cos, Math.tan
- [x] Math.log (natural log)
- [x] Math.log10 (base-10 log)
- [x] Math.floor, Math.ceil, Math.round

### 4. Constants
- [x] PI (3.14159...)
- [x] E (euler's number)

### 5. CLI Interface
- [x] Evaluate expression from command line arguments
- [x] Interactive REPL mode when no arguments provided
- [x] Error handling with descriptive messages

### 6. API Endpoint
- [x] POST /api/calculator - Evaluate expression
- [x] JSON request body: { "expression": "2 + 2" }
- [x] JSON response: { "result": 4, "expression": "2 + 2" }

## Operation Precedence

1. Parentheses ()
2. Functions (sin, cos, sqrt, etc.)
3. Exponentiation ^
4. Unary minus -
5. Multiplication *, Division /, Modulo %
6. Addition +, Subtraction -

## Error Handling

- Division by zero returns Infinity or throws error
- Invalid syntax returns descriptive error
- Unknown functions return error
- Empty expression returns error

## Acceptance Criteria

1. ✅ CLI evaluates expressions passed as arguments
2. ✅ REPL mode allows interactive calculation
3. ✅ API endpoint evaluates expressions via POST
4. ✅ All basic operations work correctly
5. ✅ Operation precedence is respected
6. ✅ Parentheses group expressions correctly
7. ✅ Error messages are helpful and descriptive
8. ✅ Unit tests cover core functionality