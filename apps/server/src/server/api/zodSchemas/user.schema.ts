import {z} from 'zod';

export const updateUserSchema = z.object({
  body: z
    .object({
      name: z.string(),
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
