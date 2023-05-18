import { TRPCError } from "@trpc/server";
import { createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"
import { Prisma } from "@prisma/client";


interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}
type checkUserHasSitePermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};

type checkIfPlanetROSiteArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
}

// Compares the User in session or token with the Site that is being Read, Updated or Deleted
const checkUserHasSitePermission = async ({ ctx, siteId, userId }: checkUserHasSitePermissionArgs) => {
    const siteToCRUD = await ctx.prisma.site.findFirst({
        where: {
            id: siteId,
        }
    });
    if (!siteToCRUD) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Site with that id does not exist, cannot update site",
        });
    }
    if (siteToCRUD.userId !== userId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to update this site",
        });
    }
    return siteToCRUD
};

const checkIfPlanetROSite = async ({ ctx, siteId }: checkIfPlanetROSiteArgs) => {
    const siteToCRUD = await ctx.prisma.site.findFirst({
        where: {
            id: siteId,
        },
        select: {
            userId: true,
            projectId: true,
        },
    });
    if (siteToCRUD?.projectId) {
        return true
    } else {
        return false
    }
}

export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const radius = input.radius ?? 0
                const origin = 'firealert'
        
                const site = await ctx.prisma.site.create({
                    data: {
                        origin: origin,
                        type: input.type,
                        name: input.name,
                        geometry: JSON.stringify(input.geometry),
                        radius: radius,
                        isMonitored: input.isMonitored,
                        userId: userId,
                        projectId: input.projectId,
                    },
                });
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

    getAllSitesForProject: protectedProcedure
        .input(getSitesWithProjectIdParams)
        .query(async ({ ctx, input }) => {
            try {
                const sitesForProject = await ctx.prisma.site.findMany({
                    where: {
                        projectId: input.projectId,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        geometry: true,
                        radius: true,
                        isMonitored: true,
                        deletedAt: true,
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

    getAllSites: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found in session",
                });
            }
            try {
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: userId,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        geometry: true,
                        radius: true,
                        isMonitored: true,
                        deletedAt: true,
                        projectId: true,
                        lastUpdated: true,
                        userId: true,
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
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
                const site = await ctx.prisma.site.findFirst({
                    where: {
                        id: input.siteId
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
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const site = await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: userId });
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
                        geometry: JSON.stringify(geometry),
                    };
                }
                // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })
                if (isPlanetROSite) {
                    const { geometry, type, name, projectId, ...rest } = updatedData;
                    if(geometry || type || name || projectId){
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
            // Check if user is authenticated
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.siteId })
                if (isPlanetROSite){
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Cannot delete Site fetched from planet webapp, please delete it from planet webapp",
                    });
                }
                const deletedSite = await ctx.prisma.site.delete({
                    where: {
                        id: input.siteId,
                    },
                });
                return {
                    status: "success",
                    data: deletedSite,
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

