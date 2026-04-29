/**
 * Calculator API Router
 * POST /api/calculator - Evaluate a mathematical expression
 */

import { Router } from 'express';
import { z } from 'zod';
import { calculate, CalculatorError } from '../calculator.js';

const calculatorSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
});

export function calculatorRouter(): Router {
  const router = Router();

  router.post('/', (req, res) => {
    try {
      const { expression } = calculatorSchema.parse(req.body);
      const result = calculate(expression);
      res.json({ expression, result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request', 
          details: error.errors 
        });
      } else if (error instanceof CalculatorError) {
        res.status(400).json({ 
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          error: 'Internal server error' 
        });
      }
    }
  });

  return router;
}