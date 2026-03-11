import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateMaxLength,
  validate,
  ValidationRule,
} from './index';

describe('forms validation helpers', () => {
  it('validateRequired returns false for empty or whitespace-only values', () => {
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
    expect(validateRequired('text')).toBe(true);
  });

  it('validateMaxLength respects max length and ignores null/undefined', () => {
    expect(validateMaxLength('', 5)).toBe(true);
    expect(validateMaxLength(null, 5)).toBe(true);
    expect(validateMaxLength(undefined, 5)).toBe(true);
    expect(validateMaxLength('short', 5)).toBe(true);
    expect(validateMaxLength('too long', 5)).toBe(false);
  });

  it('validate returns true only if all rules pass', () => {
    const rules: ValidationRule[] = [
      validateRequired,
      (value) => validateMaxLength(value, 10),
    ];
    expect(validate('ok', rules)).toBe(true);
    expect(validate('     ', rules)).toBe(false);
    expect(validate('this is definitely too long', rules)).toBe(false);
  });
});

