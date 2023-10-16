import {TRPCError} from "@trpc/server";
import {createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema} from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import {checkUserHasSitePermission, checkIfPlanetROSite, triggerTestAlert} from '../../../utils/routers/site'
import {Prisma, SiteAlert} from "@prisma/client";
import {UserPlan} from "../../../Interfaces/AlertMethod";

export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            // const userPlan = ctx.user!.plan ? ctx.user!.plan as UserPlan : 'basic';
            // const siteCount = await ctx.prisma.site.count({
            //     where:{
            //         userId,
            //     }
            // })
            // if(userPlan === 'basic'){
            //     if (siteCount >= 20){
            //         return {
            //             status: 'error',
            //             httpStatus: 403,
            //             code: 'FORBIDDEN',
            //             message: `You've exceeded the fair site use limits of FireAlert. Please contact info@plant-for-the-planet to remove these limits for your account.`,
            //         };
            //     }
            // }
            // if(userPlan === 'custom'){
            //     if (siteCount >= 50){
            //         return {
            //             status: 'error',
            //             httpStatus: 403,
            //             code: 'FORBIDDEN',
            //             message: `You've exceeded the fair site use limits of FireAlert. You cannot create any more sites.`,
            //         };
            //     }
            // }
            try {
                const origin = 'firealert';
                const lastUpdated = new Date();
                let radius = 0;
                // radius 0 on Point would generally not return any results
                // So monitor 1km around the point by default

                if (input.type === 'Point' && input.radius === 0) {
                    radius = 1000;
                }
                else {
                    radius = input.radius;
                }

                const site = await ctx.prisma.site.create({
                    data: {
                        origin: origin,
                        type: input.type,
                        name: input.name,
                        geometry: input.geometry,
                        radius: radius,
                        isMonitored: input.isMonitored,
                        userId: userId,
                        lastUpdated: lastUpdated,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    },
                });

                return {
                    status: "success",
                    data: site,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    getSitesForProject: protectedProcedure
        .input(getSitesWithProjectIdParams)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                // Only returns a list of sites if the user has sites with the inputted projectId, else returns not found.
                // TODO: test when this returns an empty array, and when it throws an error. 
                const sitesForProject = await ctx.prisma.site.findMany({
                    where: {
                        projectId: input.projectId,
                        deletedAt: null,
                        userId: userId,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
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
        .query(async ({ctx}) => {
            const userId = ctx.user!.id;
            try {
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: userId,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
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
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
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
                        remoteId: true,
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
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    updateSite: protectedProcedure
        .input(updateSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            const site = await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: userId });
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
                            message: `PlanetRO Users can only update Radius and isMonitored Field`,
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
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                });
                return {
                    status: 'success',
                    data: updatedSite,
                };

            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Error Updating Site.`,
                });
            }
        }),

    triggerTestAlert: protectedProcedure
        .input(params)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            const site = await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
            if (!site) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Site with that id does not exist, cannot trigger alert",
                });
            }
            try {
                const alert: SiteAlert = await triggerTestAlert(input.siteId)
                return {
                    status: 'success',
                    data: alert,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: `INTERNAL_SERVER_ERROR`,
                    message: `Something Went Wrong`,
                });
            }
        }),

    deleteSite: protectedProcedure
        .input(params)
        .mutation(async ({ctx, input}) => {
            // Check if user is authenticated and not soft deleted
            const userId = ctx.user!.id;
            await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
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
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),
});
