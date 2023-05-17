import {z} from 'zod';

// export const createUserSchema = z.object({
//     id: z.string(),
//     name: z.string().optional(),
//     email: z.string().optional(),
//     emailVerified: z.string().optional(),
//     isPlanetRO: z.boolean().optional(),
//     avatar: z.string().optional(),
//     isVerified: z.boolean().optional(),
//     roles: z.enum(['USER', 'ADMIN', 'ROLE_BACKEND']),
// })

// export const params = z.object({
//     userId: z.string(),
// })

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string(),
        isPlanetRO: z.boolean(),
        avatar: z.string(),
        roles: z.enum(['ROLE_CLIENT', 'ROLE_ADMIN', 'ROLE_SUPPORT']),
    }).partial(),
})


