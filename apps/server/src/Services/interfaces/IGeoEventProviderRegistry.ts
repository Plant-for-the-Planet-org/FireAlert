import type {GeoEventProviderClass} from '../../Interfaces/GeoEventProvider';

export interface IGeoEventProviderRegistry {
  register(provider: GeoEventProviderClass): void;
  get(key: string): GeoEventProviderClass;
  getAll(): GeoEventProviderClass[];
  has(key: string): boolean;
  remove(key: string): boolean;
  clear(): void;
  getKeys(): string[];
}

export interface ProviderRegistrationOptions {
  override?: boolean;
  validate?: boolean;
}

export interface ProviderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
