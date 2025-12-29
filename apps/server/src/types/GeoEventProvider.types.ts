import {type GeoEventProvider} from '@prisma/client';
import {type GeoEventProviderClientId} from '../Interfaces/GeoEventProvider';

/**
 * Parsed configuration from provider.config JSON field
 */
export interface ProviderConfig {
  client: string; // e.g., "FIRMS", "GOES-16"
  slice: string; // e.g., "1", "2", "NRT"
  bbox?: string;
  apiUrl?: string;
  [key: string]: unknown; // Allow additional config properties
}

/**
 * Destructured provider data used in processing
 */
export interface ProviderData {
  config: ProviderConfig;
  id: string; // geoEventProviderId
  clientId: GeoEventProviderClientId;
  clientApiKey: string;
  lastRun: Date | null;
}

/**
 * Result from processGeoEvents function
 */
export interface ProcessedGeoEventResult {
  geoEventCount: number;
  newGeoEventCount: number;
}

/**
 * Type guard to check if a value is a valid ProviderConfig
 */
export function isProviderConfig(value: unknown): value is ProviderConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Record<string, unknown>;
  return typeof config.client === 'string' && typeof config.slice === 'string';
}

/**
 * Type guard to validate GeoEventProvider from database
 */
export function isValidGeoEventProvider(
  provider: unknown,
): provider is GeoEventProvider {
  if (typeof provider !== 'object' || provider === null) return false;
  const p = provider as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.clientId === 'string' &&
    typeof p.clientApiKey === 'string' &&
    typeof p.config === 'object'
  );
}
