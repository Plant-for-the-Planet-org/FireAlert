import { TRPCError } from "@trpc/server";
import { createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"
import { makeDetectionCoordinates } from '../../../utils/turf'


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
        },
        select: {
            userId: true,
        },
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
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "This site can only be deleted from planet web app",
        });
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
                const detectionCoordinates = makeDetectionCoordinates(input.geometry, input.radius)
                const site = await ctx.prisma.site.create({
                    data: {
                        type: input.type,
                        name: input.name,
                        geometry: input.geometry,
                        detectionCoordinates: detectionCoordinates,
                        radius: input.radius,
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
                        guid: true,
                        name: true,
                        type: true,
                        geometry: true,
                        radius: true,
                        isMonitored: true,
                        lastSynced: true,
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
                // const sitesWithPointType = sitesForProject.filter((site) => site.type === "Point");
                // const sitesWithPolygonType = sitesForProject.filter((site) => site.type === "Polygon");
                // const sitesWithMultiPolygonType = sitesForProject.filter((site) => site.type === "MultiPolygon");
                // return {
                //     point: sitesWithPointType,
                //     polygon: sitesWithPolygonType,
                //     multiPolygon: sitesWithMultiPolygonType,
                // };                
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
                        guid: true,
                        name: true,
                        type: true,
                        geometry: true,
                        radius: true,
                        isMonitored: true,
                        lastSynced: true,
                        deletedAt: true,
                        projectId: true,
                        lastUpdated: true,
                        userId: true,
                    }
                })
                return {
                    status: 'success',
                    data: sites,
                };
                // const sitesWithPointType = sites.filter((site) => site.type === "Point");
                // const sitesWithPolygonType = sites.filter((site) => site.type === "Polygon");
                // const sitesWithMultiPolygonType = sites.filter((site) => site.type === "MultiPolygon");
                // return {
                //     point: sitesWithPointType,
                //     polygon: sitesWithPolygonType,
                //     multiPolygon: sitesWithMultiPolygonType,
                // };
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
                await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: userId });
                await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })

                const site = await ctx.prisma.site.findUnique({
                    where: {
                        id: input.params.siteId,
                    },
                });

                let updatedData = input.body;

                // Check to see if the input.body has radius or geometry, or both in it.
                const hasRadius = updatedData.hasOwnProperty('radius');
                const hasGeometry = updatedData.hasOwnProperty('geometry');
                const hasType = updatedData.hasOwnProperty('type');

                // If input.body.radius is only there, then find the site using siteId, then find the coordinates, then use makeDetectionCoordinates to find the detectionCoordinates to update it.
                if (hasRadius && !hasGeometry) {
                    const detectionCoordinates = makeDetectionCoordinates(site.geometry, updatedData.radius);
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // If input.body.geometry is only there but no radius, then find the radius from site, then update detectionCoordinates
                else if (hasGeometry && !hasRadius) {
                    const detectionCoordinates = makeDetectionCoordinates(updatedData.geometry, site.radius);
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // If both is there, then makeDetectionCoordinates and update it
                else if (hasRadius && hasGeometry) {
                    const detectionCoordinates = makeDetectionCoordinates(updatedData.geometry, updatedData.radius);
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // Check if the 'type' property is present in input.body and that the value of 'type' matches the value of 'type' in input.body.geometry.
                if (hasType) {
                    if (!hasGeometry || updatedData.geometry.type !== updatedData.type) {
                        throw new TRPCError({
                            code: "PARSE_ERROR",
                            message: "Invalid input: 'type' property must match the 'type' property of the 'geometry' object",
                        });
                    }
                }
                // If none of them is there, then just update:
                const updatedSite = await ctx.prisma.site.update({
                    where: {
                        id: input.params.siteId,
                    },
                    data: updatedData,
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
                await checkIfPlanetROSite({ ctx, siteId: input.siteId })
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


