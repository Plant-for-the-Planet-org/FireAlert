import {z} from 'zod';

export const createSiteSchema = z.object({
    type: z.string({
        required_error: 'Type of site is required!'
    }),
    geometry: z.object({
        type: z.string(),
        coordinates: z.array(z.array(z.number())),
    }),
    radius: z.string(),
    isMonitored: z.boolean().optional(),
    userId: z.string(),
    projectId: z.string().optional(),
})

export const params = z.object({
    siteId: z.string(),
})

export const updateSiteSchema = z.object({
    params,
    body: z.object({
        type: z.string(),
        geometry: z.object({
            type: z.string(),
            coordinates: z.array(z.array(z.number()))
        }),
        radius: z.string(),
        isMonitored: z.boolean().optional(),
        projectId: z.string().optional(),
    }).partial(),
})
