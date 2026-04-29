import { ASTNode, NumberNode, BinaryOpNode, UnaryMinusNode } from './parser';

/**
 * Evaluator that walks the AST and computes the result
 * Uses recursive tree traversal
 */
export class Evaluator {
  evaluate(node: ASTNode): number {
    switch (node.type) {
      case 'number':
        return (node as NumberNode).value;

      case 'binary': {
        const binary = node as BinaryOpNode;
        const left = this.evaluate(binary.left);
        const right = this.evaluate(binary.right);

        switch (binary.operator) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            if (right === 0) {
              throw new Error('Division by zero');
            }
            return left / right;
          case '^':
            return Math.pow(left, right);
          default:
            throw new Error(`Unknown operator: ${binary.operator}`);
        }
      }

      case 'unary-minus': {
        const unary = node as UnaryMinusNode;
        return -this.evaluate(unary.operand);
      }

      default:
        throw new Error(`Unknown node type`);
    }
  }
}