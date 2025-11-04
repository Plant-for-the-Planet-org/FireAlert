import type {GeoEventProviderConfigGeneral} from '../../../Interfaces/GeoEventProvider';

export interface ValidationRule {
  field: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  validator?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class GeoEventProviderValidator {
  static validateConfig(
    config: GeoEventProviderConfigGeneral | undefined,
    rules: ValidationRule[],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push('Configuration is required');
      return {isValid: false, errors, warnings};
    }

    for (const rule of rules) {
      const value = config[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(rule.message || `Field '${rule.field}' is required`);
        continue;
      }

      // Skip type checking if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (rule.type && !this.isValidType(value, rule.type)) {
        errors.push(
          rule.message || `Field '${rule.field}' must be of type ${rule.type}`,
        );
        continue;
      }

      // Custom validation
      if (rule.validator && !rule.validator(value)) {
        errors.push(rule.message || `Field '${rule.field}' failed validation`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isValidType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  // Common validation rules for different provider types
  static getNasaProviderRules(): ValidationRule[] {
    return [
      {
        field: 'apiUrl',
        required: true,
        type: 'string',
        validator: (value: string) => value.startsWith('http'),
        message: 'apiUrl must be a valid HTTP URL',
      },
      {
        field: 'bbox',
        required: true,
        type: 'string',
        validator: (value: string) => {
          // Basic bbox format validation (should be comma-separated coordinates)
          const parts = value.split(',');
          return (
            parts.length === 4 && parts.every(part => !isNaN(parseFloat(part)))
          );
        },
        message: 'bbox must be in format "minLon,minLat,maxLon,maxLat"',
      },
      {
        field: 'slice',
        required: true,
        type: 'string',
      },
      {
        field: 'client',
        required: true,
        type: 'string',
      },
    ];
  }

  static getGOES16ProviderRules(): ValidationRule[] {
    return [
      {
        field: 'apiUrl',
        required: true,
        type: 'string',
        validator: (value: string) => value.startsWith('http'),
        message: 'apiUrl must be a valid HTTP URL',
      },
      // Add other GOES16-specific validation rules
    ];
  }
}
