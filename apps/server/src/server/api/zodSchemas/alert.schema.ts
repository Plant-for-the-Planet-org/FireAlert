import {z} from 'zod';

export const queryAlertSchema = z.object({
    id: z.string().cuid({ message: "Invalid ID" }).or(z.string().uuid({ message: "Invalid ID" })),
})





