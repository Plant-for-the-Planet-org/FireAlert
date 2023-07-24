import {z} from 'zod';

export const queryAlertSchema = z.object({
  id: z.string(),
});
