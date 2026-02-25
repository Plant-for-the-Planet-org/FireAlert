import {z} from 'zod';
import validator from 'validator';

export const idSchema = z
  .string()
  .min(1, {message: 'ID must be 1 or more characters long'})
  .max(100, {message: 'ID be 100 or less characters long'})
  .refine(
    value => {
      const sanitized = validator.escape(value);
      return sanitized === value;
    },
    {
      message: 'Invalid ID',
    },
  );

export const createGeoEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  eventDate: z.string().datetime().optional(),
  geoEventProviderId: idSchema.optional(),
});

export const createSiteAlertSchema = z.object({
  siteId: idSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  eventDate: z.string().datetime().optional(),
  geoEventProviderId: idSchema.optional(),
});
