/**
 * Calculator Expression Evaluator
 * Supports basic operations, functions, constants, and proper operator precedence
 */

export class CalculatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculatorError';
  }
}

type TokenType = 'NUMBER' | 'OPERATOR' | 'FUNCTION' | 'LPAREN' | 'RPAREN' | 'CONSTANT';

interface Token {
  type: TokenType;
  value: string | number;
}

const CONSTANTS: Record<string, number> = {
  'PI': Math.PI,
  'E': Math.E,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  'sin': Math.sin,
  'cos': Math.cos,
  'tan': Math.tan,
  'asin': Math.asin,
  'acos': Math.acos,
  'atan': Math.atan,
  'sqrt': Math.sqrt,
  'abs': Math.abs,
  'log': Math.log,
  'log10': Math.log10,
  'log2': Math.log2,
  'floor': Math.floor,
  'ceil': Math.ceil,
  'round': Math.round,
  'exp': Math.exp,
  'pow': Math.pow,
  'min': Math.min,
  'max': Math.max,
};

const OPERATORS: Record<string, { precedence: number; associativity: 'left' | 'right' }> = {
  '+': { precedence: 1, associativity: 'left' },
  '-': { precedence: 1, associativity: 'left' },
  '*': { precedence: 2, associativity: 'left' },
  '/': { precedence: 2, associativity: 'left' },
  '%': { precedence: 2, associativity: 'left' },
  '^': { precedence: 3, associativity: 'right' },
};

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const expr = expression.replace(/\s+/g, '');

  while (i < expr.length) {
    const char = expr[i];

    // Number
    if (/\d/.test(char) || (char === '.' && /\d/.test(expr[i + 1] || ''))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
    }
    // Function or constant
    else if (/[a-zA-Z_]/.test(char)) {
      let name = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) {
        name += expr[i];
        i++;
      }
      if (CONSTANTS[name.toUpperCase()] !== undefined) {
        tokens.push({ type: 'CONSTANT', value: CONSTANTS[name.toUpperCase()] });
      } else {
        tokens.push({ type: 'FUNCTION', value: name.toLowerCase() });
      }
    }
    // Operators and parentheses
    else if ('+-*/%^'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
    } else {
      throw new CalculatorError(`Unexpected character: '${char}'`);
    }
  }

  return tokens;
}

function evaluateNode(node: AstNode): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'constant':
      return node.value;
    case 'unary':
      if (node.operator === '-') {
        return -evaluateNode(node.operand);
      }
      throw new CalculatorError(`Unknown unary operator: ${node.operator}`);
    case 'binary':
      const left = evaluateNode(node.left);
      const right = evaluateNode(node.right);
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': 
          if (right === 0) throw new CalculatorError('Division by zero');
          return left / right;
        case '%':
          if (right === 0) throw new CalculatorError('Division by zero');
          return left % right;
        case '^': return Math.pow(left, right);
        default:
          throw new CalculatorError(`Unknown operator: ${node.operator}`);
      }
    case 'function':
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new CalculatorError(`Unknown function: ${node.name}`);
      const args = node.args.map(evaluateNode);
      return fn(...args);
    default:
      throw new CalculatorError('Invalid AST node');
  }
}

type AstNode = 
  | { type: 'number'; value: number }
  | { type: 'constant'; value: number }
  | { type: 'unary'; operator: string; operand: AstNode }
  | { type: 'binary'; operator: string; left: AstNode; right: AstNode }
  | { type: 'function'; name: string; args: AstNode[] };

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AstNode {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      throw new CalculatorError(`Unexpected token: '${token.value}'`);
    }
    return result;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] || null;
  }

  private consume(): Token | null {
    return this.tokens[this.pos++] || null;
  }

  private parseExpression(): AstNode {
    return this.parseAddition();
  }

  private parseAddition(): AstNode {
    let left = this.parseMultiplication();
    
    while (this.peek()?.type === 'OPERATOR' && 
           (this.peek()?.value === '+' || this.peek()?.value === '-')) {
      const op = this.consume()!.value as string;
      const right = this.parseMultiplication();
      left = { type: 'binary', operator: op, left, right };
    }
    
    return left;
  }

  private parseMultiplication(): AstNode {
    let left = this.parseExponentiation();
    
    while (this.peek()?.type === 'OPERATOR' && 
           ('*/%'.includes(this.peek()?.value as string))) {
      const op = this.consume()!.value as string;
      const right = this.parseExponentiation();
      left = { type: 'binary', operator: op, left, right };
    }
    
    return left;
  }

  private parseExponentiation(): AstNode {
    const base = this.parseUnary();
    
    if (this.peek()?.type === 'OPERATOR' && this.peek()?.value === '^') {
      this.consume();
      const exponent = this.parseExponentiation(); // Right associative
      return { type: 'binary', operator: '^', left: base, right: exponent };
    }
    
    return base;
  }

  private parseUnary(): AstNode {
    if (this.peek()?.type === 'OPERATOR' && this.peek()?.value === '-') {
      this.consume();
      const operand = this.parseUnary();
      return { type: 'unary', operator: '-', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const token = this.peek();
    
    if (!token) {
      throw new CalculatorError('Unexpected end of expression');
    }

    if (token.type === 'NUMBER') {
      this.consume();
      return { type: 'number', value: token.value as number };
    }

    if (token.type === 'CONSTANT') {
      this.consume();
      return { type: 'constant', value: token.value as number };
    }

    if (token.type === 'FUNCTION') {
      const name = this.consume()!.value as string;
      
      if (this.peek()?.type !== 'LPAREN') {
        throw new CalculatorError(`Expected '(' after function '${name}'`);
      }
      this.consume(); // consume '('
      
      const args: AstNode[] = [];
      
      if (this.peek()?.type !== 'RPAREN') {
        args.push(this.parseExpression());
        
        while (this.peek()?.type === 'OPERATOR' && this.peek()?.value === ',') {
          this.consume();
          args.push(this.parseExpression());
        }
      }
      
      if (this.peek()?.type !== 'RPAREN') {
        throw new CalculatorError("Expected ')' after function arguments");
      }
      this.consume(); // consume ')'
      
      return { type: 'function', name, args };
    }

    if (token.type === 'LPAREN') {
      this.consume(); // consume '('
      const expr = this.parseExpression();
      
      if (this.peek()?.type !== 'RPAREN') {
        throw new CalculatorError("Missing closing parenthesis");
      }
      this.consume(); // consume ')'
      
      return expr;
    }

    throw new CalculatorError(`Unexpected token: '${token.value}'`);
  }
}

export function calculate(expression: string): number {
  if (!expression || !expression.trim()) {
    throw new CalculatorError('Empty expression');
  }

  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return evaluateNode(ast);
}

export function calculateWithResult(expression: string): { expression: string; result: number } {
  const result = calculate(expression);
  return { expression, result };
}