import {z} from 'zod';

import validator from 'validator';

export const nameSchema = z
  .string()
  .min(5, {message: 'Name must be 5 or more characters long'})
  .max(100, {message: 'Name be 100 or less characters long'})
  .refine(
    value => {
      const sanitized = validator.escape(value);
      return sanitized === value;
    },
    {
      message: 'Name contains invalid characters',
    },
  );

export const updateUserSchema = z.object({
  body: z
    .object({
      name: nameSchema,
      avatar: z.string(),
      detectionMethods: z
        .array(z.enum(['MODIS', 'VIIRS', 'LANDSAT', 'GEOSTATIONARY']))
        .min(1)
        .refine(
          values => {
            const uniqueValues = new Set(values);
            return uniqueValues.size === values.length;
          },
          {
            message: 'Detection methods must not contain duplicate values.',
          },
        ),
    })
    .partial(),
});
