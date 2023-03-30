import {z} from 'zod';

export const params = z.object({
    userId: z.string(),
})

export const updateUserSchema = z.object({
    params,
    body: z.object({
        isPlanetRO: z.boolean(),
        avatar: z.string(),
        isVerified: z.boolean(),
        roles: z.enum(['USER', 'ADMIN', 'ROLE_BACKEND']),
    }).partial(),
})
