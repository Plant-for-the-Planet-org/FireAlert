import { z } from 'zod';

const PointSchema = z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
});

const PolygonSchema = z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(z.union([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number(), z.optional(z.number())])])))
});


const MultiPolygonSchema = z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.union([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number(), z.optional(z.number())])])))
});

export const createSiteSchema = z.object({
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    name: z.string().optional(),
    geometry: z.union([PointSchema, PolygonSchema, MultiPolygonSchema]),
    radius: z.number().optional().default(0),
    isMonitored: z.boolean().optional(),
    userId: z.string().optional(),
    projectId: z.string().nullable().optional(),
}).refine((obj) => obj.type === obj.geometry.type, {
    message: "geometry type does not match the specified type",
    path: ["geometry.type", "type"],
});


export const params = z.object({
    siteId: z.string(),
})

export const getSitesWithProjectIdParams = z.object({
    projectId: z.string(),
})
const bodySchema = z.object({
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    name: z.string(),
    geometry: z.union([PointSchema, PolygonSchema, MultiPolygonSchema]),
    radius: z.number(),
    isMonitored: z.boolean(),
    projectId: z.string().nullable(),
}).partial().refine((obj) => {
    if (obj.geometry) {
        return obj.type === obj.geometry.type;
    }
    return true;
}, {
    message: "geometry type does not match the specified type",
    path: ["geometry.type", "type"],
});

export const updateSiteSchema = z.object({
    params,
    body: bodySchema,
});


export type Geometry = z.TypeOf<typeof PointSchema | typeof PolygonSchema | typeof MultiPolygonSchema>;