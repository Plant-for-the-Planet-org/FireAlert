import { z } from "zod";
import { nameSchema } from "./user.schema";
import validator from 'validator';

export const descriptionSchema = z.string().min(5, { message: "Description must be 5 or more characters long" }).max(1000, { message: "Description be 1000 or less characters long" }).refine(value => {
    const sanitized = validator.escape(value);
    return sanitized === value;
}, {
message: 'Description contains invalid characters',
});

// Zod Schema for createGeoEventProvider
export const createGeoEventProviderSchema = z.object({
    isActive: z.boolean().optional(),
    name: nameSchema,
    description: descriptionSchema.optional(),
});

// Zod Schema for updateGeoEventProvider body
const UpdateGeoEventProviderBodySchema = z.object({
    isActive: z.boolean(),
    name: nameSchema,
    description: descriptionSchema,
}).partial();

// Zod Schema for updateGeoEventProvider params
export const geoEventProviderParamsSchema = z.object({
    id: z.string().cuid({ message: "Invalid CUID" }),
});

// Zod Schema for updateGeoEventProvider
export const updateGeoEventProviderSchema = z.object({
    params: geoEventProviderParamsSchema,
    body: UpdateGeoEventProviderBodySchema,
});