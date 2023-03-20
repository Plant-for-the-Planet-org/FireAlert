import {z} from 'zod';

export const createSiteSchema = z.object({
    type: z.string({
        required_error: 'Type of site is required!'
    }),
    geometry: z.object({
        coordinates: z.number().array().nonempty({
            message: 'Coordinates cannot be empty'
        }),
    }),
    radius: z.string(),
    isMonitored: z.boolean(),
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
            coordinates: z.number().array().nonempty()
        }),
        radius: z.string(),
        isMonitored: z.boolean(),
        projectId: z.string().optional(),
    }).partial(),
})
