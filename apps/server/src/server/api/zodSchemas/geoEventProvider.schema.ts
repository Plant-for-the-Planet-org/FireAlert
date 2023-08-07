import {z} from 'zod';
import validator from 'validator';

export const sanitizedStringSchema = z.string().refine(
  value => {
    const sanitized = validator.escape(value);
    return sanitized === value;
  },
  {
    message: 'Contains invalid characters',
  },
);

const GeoEventProviderConfigSchema = z.object({
  apiUrl: sanitizedStringSchema,
  mapKey: sanitizedStringSchema,
  sourceKey: sanitizedStringSchema,
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
  id: z.string().cuid({message: 'Invalid CUID'}),
});

// Zod Schema for updateGeoEventProvider
export const updateGeoEventProviderSchema = z.object({
  params: geoEventProviderParamsSchema,
  body: UpdateGeoEventProviderBodySchema,
});
