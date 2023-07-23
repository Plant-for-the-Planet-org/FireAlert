import {z} from 'zod';

export const queryAlertSchema = z.object({
    id: z.string(),
})


export const falsePositiveSchema = z.object({
    alertId: z.string(),
})




