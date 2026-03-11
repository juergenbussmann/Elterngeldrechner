/**
 * Checks whether a value contains non-whitespace characters after trimming.
 */
export const validateRequired = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  return value.trim().length > 0;
};

/**
 * Ensures a value is empty or stays within the provided maximum length.
 */
export const validateMaxLength = (
  value: string | null | undefined,
  max: number
): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  return value.trim().length <= max;
};

export type ValidationRule = (value: string | null | undefined) => boolean;

/**
 * Runs all validation rules against a value; returns true only if all pass.
 */
export const validate = (
  value: string | null | undefined,
  rules: ValidationRule[]
): boolean => {
  if (!rules || rules.length === 0) {
    return true;
  }

  return rules.every((rule) => rule(value));
};

