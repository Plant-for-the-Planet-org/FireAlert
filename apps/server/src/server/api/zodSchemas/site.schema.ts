import {z} from 'zod';
import {nameSchema} from './user.schema';
// All coordinates are in [longitude, latitude] format
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
    coordinates: z.array(
        z.array(
            z.array(
                z.union([
                    z.tuple([z.number(), z.number()]),
                    z.tuple([z.number(), z.number(), z.optional(z.number())])
                ])
            )
        )
    )
});

export const createSiteSchema = z.object({
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    name: nameSchema.optional(),
    geometry: z.union([PointSchema, PolygonSchema, MultiPolygonSchema]),
    radius: z.number().optional().default(0),
    isMonitored: z.boolean().optional(),
    userId: z.string().cuid({ message: "Invalid CUID" }).optional(),
}).refine((obj) => obj.type === obj.geometry.type, {
    message: "geometry type does not match the specified type",
    path: ["geometry.type", "type"],
});


export const protectedSiteSchema = z.object({
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    name: nameSchema.optional(),
    geometry: z.union([PointSchema, PolygonSchema, MultiPolygonSchema]),
    radius: z.number().optional().default(0),
    externalId: z.string().optional(),
    isActive: z.boolean().optional(),
}).refine((obj) => obj.type === obj.geometry.type, {
    message: "geometry type does not match the specified type",
    path: ["geometry.type", "type"],
});
export const protectedSiteParams = z.object({
    siteId: z.string().cuid({message: "Invalid CUID"}).optional(),
    externalId: z.string().optional(),
})
export const findProtectedSiteParams = z.object({
    query: z.string()
});
export const createProtectedSiteSchema = z.object({
    remoteId: z.string()
})
// export const createProtectedSiteSchema = protectedSiteSchema;
export const joinProtectedSiteParams = protectedSiteParams;
export const updateProtectedSiteSchema = z.object({
    params: protectedSiteParams,
    body: z.object({
        isActive: z.boolean().optional(),
    })
});

export const params = z.object({
    siteId: z.string().cuid({message: "Invalid CUID"}),
})

export const getSitesWithProjectIdParams = z.object({
    projectId: z.string(),
})
const bodySchema = z.object({
    type: z.enum(["Point", "Polygon", "MultiPolygon"]),
    name: nameSchema,
    geometry: z.union([PointSchema, PolygonSchema, MultiPolygonSchema]),
    radius: z.number(),
    isMonitored: z.boolean(),
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




export const pauseAlertInputSchema = z.object({
    siteId: z.string().cuid({message: "Invalid CUID"}),
    duration: z.number().min(1),
    unit: z.enum(['minutes', 'hours', 'days']),
});


export type Geometry = z.TypeOf<typeof PointSchema | typeof PolygonSchema | typeof MultiPolygonSchema>;
