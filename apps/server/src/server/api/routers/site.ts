import { TRPCError } from "@trpc/server";
import { createSiteSchema, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { getUserIdByToken } from "../../../utils/token";
import { type InnerTRPCContext, PPJwtPayload } from "../trpc"

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
                const site = await ctx.prisma.site.create({
                    data: {
                        type: input.type,
                        name: input.name,
                        geometry: input.geometry,
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
                    code: "CONFLICT",
                    message: "Probably, site with that siteId already exists!",
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
                    }
                })
                return {
                    status: 'success',
                    data: sites,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Sites Not Found',
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
                    message: 'Cannot get site',
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
                await checkIfPlanetROSite({ctx, siteId: input.params.siteId})
                const updatedSite = await ctx.prisma.site.update({
                    where: {
                        id: input.params.siteId
                    },
                    data: input.body,
                });
                return {
                    status: 'success',
                    data: updatedSite,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: 'An error occurred while updating the site',
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
                await checkIfPlanetROSite({ctx, siteId: input.siteId})
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
                    message: 'An error occurred while deleting the site',
                });
            }
        }),
});


