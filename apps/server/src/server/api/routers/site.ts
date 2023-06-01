import { TRPCError } from "@trpc/server";
import { createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUser } from '../../../utils/routers/user'
import { checkUserHasSitePermission, checkIfPlanetROSite } from '../../../utils/routers/site'
import { Prisma } from "@prisma/client";

export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx);
            try {
                const radius = input.radius ?? 0;
                const origin = 'firealert';
                const lastUpdated = new Date();

                const site = await ctx.prisma.site.create({
                    data: {
                        origin: origin,
                        type: input.type,
                        name: input.name,
                        geometry: input.geometry,
                        radius: radius,
                        isMonitored: input.isMonitored,
                        userId: user.id,
                        lastUpdated: lastUpdated,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        geometry: true,
                    },
                });


                const siteAlertCreationQuery = Prisma.sql`
                INSERT INTO "SiteAlert" (id, "type", "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
                SELECT
                    gen_random_uuid(),
                    e.type,
                    TRUE,
                    e."eventDate",
                    e."identityGroup"::"GeoEventDetectionInstrument",
                    e.confidence,
                    e.latitude,
                    e.longitude,
                    s.id,
                    e.data,
                    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
                FROM
                    "GeoEvent" e
                    INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
                        AND s."deletedAt" IS NULL
                        AND s.id = ${site.id}
                        AND s."isMonitored" IS TRUE
                WHERE
                    e."isProcessed" = TRUE
                    AND NOT EXISTS (
                        SELECT
                            1
                        FROM
                            "SiteAlert"
                        WHERE
                            "SiteAlert"."isProcessed" = FALSE
                            AND "SiteAlert".longitude = e.longitude
                            AND "SiteAlert".latitude = e.latitude
                            AND "SiteAlert"."eventDate" = e."eventDate"
                    );
            `;
                const response = await ctx.prisma.$executeRaw(siteAlertCreationQuery);

                console.log(response)
                return {
                    status: "success",
                    data: site,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),






    // Todo: Generate alerts (but no notifications) for the new site from the (last 30 days) on GeoEvents where isProcessed = true.

    // //Todo: Refactor the above

    // await Prisma.$executeRaw(genAlertsForNewSite)


    getSitesForProject: protectedProcedure
        .input(getSitesWithProjectIdParams)
        .query(async ({ ctx, input }) => {
            try {
                await getUser(ctx)
                const sitesForProject = await ctx.prisma.site.findMany({
                    where: {
                        projectId: input.projectId,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        lastUpdated: true,
                        userId: true,
                        geometry: true,
                    }
                })
                return {
                    status: 'success',
                    data: sitesForProject,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    getSites: protectedProcedure
        .query(async ({ ctx }) => {
            const user = await getUser(ctx)
            try {
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: user.id,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        userId: true,
                        geometry: true,
                    }
                })
                return {
                    status: 'success',
                    data: sites,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    getSite: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: user.id });
                const site = await ctx.prisma.site.findFirst({
                    where: {
                        id: input.siteId,
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                })
                if (site) {
                    return {
                        status: 'success',
                        data: site,
                    }
                } else {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Cannot find a site with that siteId for the user associated with the ${ctx.token ? 'token' : 'session'}!`
                    });
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    updateSite: protectedProcedure
        .input(updateSiteSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)

            const site = await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: user.id });
            if (!site) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Site with that id does not exist, cannot update site",
                });
            }
            try {
                let updatedData = input.body
                // Initialize data
                let data: Prisma.SiteUpdateInput = updatedData;
                // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })
                if (isPlanetROSite) {
                    const { geometry, type, name, ...rest } = updatedData;
                    if (geometry || type || name) {
                        throw new TRPCError({
                            code: "UNAUTHORIZED",
                            message: `PlanetRO Users can only update Geometry and isMonitored Field`,
                        });
                    }
                    data = rest;
                }
                // Update the site using the modified data object
                const updatedSite = await ctx.prisma.site.update({
                    where: {
                        id: input.params.siteId,
                    },
                    data: data,
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        userId: true,
                        geometry: true,
                    }
                });
                return {
                    status: 'success',
                    data: updatedSite,
                };

            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `${error}`,
                });
            }
        }),


    deleteSite: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated and not soft deleted
            const user = await getUser(ctx)

            await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: user.id });
            const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.siteId })

            if (isPlanetROSite) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "FireAlert cannot delete Site fetched from Plant-for-the-Planet, Please delete it from Plant-for-the-Planet Platform",
                });
            }
            try {
                // Soft Delete the site & Alerts associated with it. Set deletedAt to current time
                await ctx.prisma.site.update({
                    where: {
                        id: input.siteId,
                    },
                    data: {
                        deletedAt: new Date(),
                    }
                });

                await ctx.prisma.siteAlert.updateMany({
                    where: {
                        siteId: input.siteId,
                    },
                    data: {
                        deletedAt: new Date(),
                    }
                });

                return {
                    status: "success",
                    message: `Site with id ${input.siteId} deleted successfully`,
                };


            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
