import {z} from 'zod';

export const fetchAlertSchema = z.object({
    mapKey: z.string(),
    source: z.string(),
    areaCoordinates: z.number().array(),
    dayRange: z.number().int(),
    date:z.date().optional()
})


