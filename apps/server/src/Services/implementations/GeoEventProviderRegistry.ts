import type {GeoEventProviderClass} from '../../Interfaces/GeoEventProvider';
import type {
  IGeoEventProviderRegistry,
  ProviderRegistrationOptions,
  ProviderValidationResult,
} from '../interfaces/IGeoEventProviderRegistry';
import {
  ProviderNotFoundError,
  ProviderAlreadyRegisteredError,
  ProviderValidationError,
} from '../core/errors';

export class GeoEventProviderRegistry implements IGeoEventProviderRegistry {
  private providers: Map<string, GeoEventProviderClass> = new Map();

  register(
    provider: GeoEventProviderClass,
    options: ProviderRegistrationOptions = {},
  ): void {
    const key = provider.getKey();

    // Validate provider if requested
    if (options.validate !== false) {
      const validation = this.validateProvider(provider);
      if (!validation.isValid) {
        throw new ProviderValidationError(key, validation.errors);
      }
    }

    // Check for existing registration
    if (this.providers.has(key) && !options.override) {
      throw new ProviderAlreadyRegisteredError(key);
    }

    this.providers.set(key, provider);
  }

  get(key: string): GeoEventProviderClass {
    const provider = this.providers.get(key);
    if (!provider) {
      throw new ProviderNotFoundError(key);
    }
    return provider;
  }

  getAll(): GeoEventProviderClass[] {
    return Array.from(this.providers.values());
  }

  has(key: string): boolean {
    return this.providers.has(key);
  }

  remove(key: string): boolean {
    return this.providers.delete(key);
  }

  clear(): void {
    this.providers.clear();
  }

  getKeys(): string[] {
    return Array.from(this.providers.keys());
  }

  private validateProvider(
    provider: GeoEventProviderClass,
  ): ProviderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if provider has required methods
    if (typeof provider.getKey !== 'function') {
      errors.push('Provider must implement getKey() method');
    }

    if (typeof provider.initialize !== 'function') {
      errors.push('Provider must implement initialize() method');
    }

    if (typeof provider.getLatestGeoEvents !== 'function') {
      errors.push('Provider must implement getLatestGeoEvents() method');
    }

    // Check if getKey returns a valid string
    try {
      const key = provider.getKey();
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        errors.push('Provider getKey() must return a non-empty string');
      }
    } catch (error) {
      errors.push('Provider getKey() method throws an error');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Utility method to get provider statistics
  getStats(): {totalProviders: number; providerKeys: string[]} {
    return {
      totalProviders: this.providers.size,
      providerKeys: this.getKeys(),
    };
  }
}
