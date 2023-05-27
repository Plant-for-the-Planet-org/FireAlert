import { TRPCError } from "@trpc/server";
import { createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { Prisma } from "@prisma/client";
import {getUser} from '../../../utils/routers/user'
import {checkUserHasSitePermission, checkIfPlanetROSite, returnSite} from  '../../../utils/routers/site'

export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            try {
                const radius = input.radius ?? 0
                const origin = 'firealert'
                const lastUpdated = new Date()
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
                });
                const returnedSite = returnSite(site)
                return {
                    status: "success",
                    data: returnedSite,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

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
                        geometry: true,
                        radius: true,
                        isMonitored: true,
                        projectId: true,
                        lastUpdated: true,
                        userId: true,
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
                        projectId: true,
                        lastUpdated: true,
                        userId: true,
                        geometry: true,
                    }
                })

                const sitesWithProjectName = await Promise.all(sites.map(async (site) => {
                    if (site.projectId) {
                        const project = await ctx.prisma.project.findFirst({
                            where: {
                                id: site.projectId
                            },
                            select: {
                                name: true
                            }
                        })
                        const projectName = project?.name;
                        return {
                            ...site,
                            projectName
                        };
                    }
                    return {
                        ...site,
                    };
                }));
                return {
                    status: 'success',
                    data: sitesWithProjectName,
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
                        projectId: true,
                        project: true,
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
            try {
                const site = await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: user.id });
                if (!site) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Site with that id does not exist, cannot update site",
                    });
                }
                let updatedData = input.body
                // Initialize data
                let data: Prisma.SiteUpdateInput = {}; // Create a copy of updatedData
                // stringify the geometry before adding it in database
                if (updatedData.geometry) {
                    const { geometry, ...rest } = updatedData;
                    data = {
                        ...rest,
                        geometry: geometry,
                    };
                }
                // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })
                if (isPlanetROSite) {
                    const { geometry, type, name, ...rest } = updatedData;
                    if(geometry || type || name){
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
                });
                const returnedSite = returnSite(updatedSite)
                return {
                    status: 'success',
                    data: returnedSite,
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
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: user.id });
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.siteId })
                if (isPlanetROSite){
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "FireAlert cannot delete Site fetched from Plant-for-the-Planet, Please delete it from Plant-for-the-Planet Platform",
                    });
                }
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
