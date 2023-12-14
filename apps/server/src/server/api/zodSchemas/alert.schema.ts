import {z} from 'zod';

import validator from 'validator';

export const idSchema = z.string().min(1, { message: "ID must be 1 or more characters long" }).max(100, { message: "ID be 100 or less characters long" }).refine(value => {
        const sanitized = validator.escape(value);
        return sanitized === value;
}, {
    message: 'Invalid ID',
});

export const queryAlertSchema = z.object({
    id: idSchema,
})

export const queryAlertsForSiteSchema = z.object({
    siteId: idSchema,
    durationInDays: z.number().optional(),
});





