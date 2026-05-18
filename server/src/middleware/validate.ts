import { Request, Response, NextFunction } from 'express';

interface FieldSchema {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string; // Return false or error message
}

interface Schema {
  body?: Record<string, FieldSchema>;
  query?: Record<string, FieldSchema>;
}

export function validate(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body fields
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }

        if (value === undefined || value === null) continue;

        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
        }

        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }

        if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }

        if (rules.custom) {
          const result = rules.custom(value);
          if (result === false) errors.push(`${field} is invalid`);
          else if (typeof result === 'string') errors.push(result);
        }
      }
    }

    // Validate query fields
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query[field];

        if (rules.required && !value) {
          errors.push(`${field} is required`);
          continue;
        }

        if (!value) continue;

        const strValue = typeof value === 'string' ? value : String(value);

        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
        }

        if (rules.minLength && strValue.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.maxLength && strValue.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }

        if (rules.pattern && !rules.pattern.test(strValue)) {
          errors.push(`${field} has invalid format`);
        }

        if (rules.custom) {
          const result = rules.custom(value);
          if (result === false) errors.push(`${field} is invalid`);
          else if (typeof result === 'string') errors.push(result);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Input validation failed',
        details: errors,
      });
    }

    next();
  };
}
