import { TRPCError } from "@trpc/server";
import { createSiteSchema, getSitesWithProjectIdParams, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"
import { makeDetectionCoordinates } from '../../../utils/turf'
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
                const detectionCoordinates = makeDetectionCoordinates(input.geometry, radius)
                const origin = 'firealert'
                const site = await ctx.prisma.site.create({
                    data: {
                        origin: origin,
                        type: input.type,
                        name: input.name,
                        geometry: JSON.stringify(input.geometry),
                        detectionCoordinates: JSON.stringify(detectionCoordinates),
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
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })
                let updatedData = {
                    ...input.body,
                    detectionCoordinates: '',
                };
                // let updatedData = input.body as typeof input.body & { detectionCoordinates?: string };

                // Check to see if the input.body has radius or geometry, or both in it.
                const hasRadius = updatedData.hasOwnProperty('radius');
                const hasGeometry = updatedData.hasOwnProperty('geometry');
                const hasType = updatedData.hasOwnProperty('type');

                // If input.body.radius is only there, then find the site using siteId, then find the coordinates, then use makeDetectionCoordinates to find the detectionCoordinates to update it.
                if (hasRadius && !hasGeometry) {
                    const siteGeometryString = JSON.stringify(site.geometry)
                    const bufferedCoordinates = makeDetectionCoordinates(JSON.parse(siteGeometryString), updatedData.radius!);
                    const detectionCoordinates = JSON.stringify(bufferedCoordinates)
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // If input.body.geometry is only there but no radius, then find the radius from site, then update detectionCoordinates
                else if (hasGeometry && !hasRadius) {
                    const updatedDataGeometryString = JSON.stringify(updatedData.geometry)
                    const bufferedCoordinates = makeDetectionCoordinates(JSON.parse(updatedDataGeometryString), site.radius);
                    const detectionCoordinates = JSON.stringify(bufferedCoordinates)
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // If both is there, then makeDetectionCoordinates and update it
                else if (hasRadius && hasGeometry) {
                    const updatedDataGeometryString = JSON.stringify(updatedData.geometry)
                    const bufferedCoordinates = makeDetectionCoordinates(JSON.parse(updatedDataGeometryString), updatedData.radius!);
                    const detectionCoordinates = JSON.stringify(bufferedCoordinates)
                    updatedData = {
                        ...updatedData,
                        detectionCoordinates,
                    };
                }
                // Check if the 'type' property is present in input.body and that the value of 'type' matches the value of 'type' in input.body.geometry.
                if (hasType) {
                    if (!hasGeometry || updatedData.geometry?.type !== updatedData.type) {
                        throw new TRPCError({
                            code: "PARSE_ERROR",
                            message: "Invalid input: 'type' property must match the 'type' property of the 'geometry' object",
                        });
                    }
                }
                if (isPlanetROSite) {
                    const { geometry, type, name, projectId, ...rest } = updatedData;
                    updatedData = rest;
                }
                // If none of them is there, then just update:
                let data:Prisma.SiteUpdateInput = {}; // Create a copy of updatedData

                if (updatedData.geometry) {
                    const {geometry, ...rest} = updatedData;
                    data = {
                        ...rest,
                        geometry: JSON.stringify(geometry),
                    };
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


