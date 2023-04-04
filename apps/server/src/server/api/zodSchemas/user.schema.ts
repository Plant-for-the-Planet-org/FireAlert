import {z} from 'zod';

export const updateUserSchema = z.object({
    body: z.object({
        isPlanetRO: z.boolean(),
        avatar: z.string(),
        isVerified: z.boolean(),
        roles: z.enum(['USER', 'ADMIN', 'ROLE_BACKEND']),
    }).partial(),
})
