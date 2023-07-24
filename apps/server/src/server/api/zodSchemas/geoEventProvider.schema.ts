import {z} from 'zod';

const GeoEventProviderConfigSchema = z.object({
  apiUrl: z.string(),
  mapKey: z.string(),
  sourceKey: z.string(),
});

// Zod Schema for createGeoEventProvider
export const createGeoEventProviderSchema = z.object({
  type: z.enum(['fire']),
  isActive: z.boolean(),
  providerKey: z.enum(['FIRMS']),
  config: GeoEventProviderConfigSchema,
});

// Zod Schema for updateGeoEventProvider body
const UpdateGeoEventProviderBodySchema = z
  .object({
    type: z.enum(['fire']),
    isActive: z.boolean(),
    providerKey: z.enum(['FIRMS']),
    config: GeoEventProviderConfigSchema,
  })
  .partial();

// Zod Schema for updateGeoEventProvider params
export const geoEventProviderParamsSchema = z.object({
  id: z.string(),
});

// Zod Schema for updateGeoEventProvider
export const updateGeoEventProviderSchema = z.object({
  params: geoEventProviderParamsSchema,
  body: UpdateGeoEventProviderBodySchema,
});
