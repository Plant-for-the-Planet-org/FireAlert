import { TRPCError } from "@trpc/server";
import { createSiteSchema, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";


export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
    .input(createSiteSchema)
    .mutation(async ({ ctx, input }) => {
        // Check if user is authenticated
        console.log('inside mutation createSite')
        if (!ctx.token && !ctx.session) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Missing authentication credentials",
            });
        }
        // Token logic
        if (ctx.token) {
            console.log('Got into token logic in createSite')
            try {
                // Find the account that has that sub
                const account = await ctx.prisma.account.findFirst({
                    where: {
                        providerAccountId: ctx.token.sub,
                    },
                    select: {
                        userId: true,
                    }
                });
                if (!account) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Cannot find an account associated with the token",
                    });
                }
                // Use the account, and create a new site with the userId that we got from account
                const site = await ctx.prisma.site.create({
                    data: {
                        type: input.type,
                        geometry: input.geometry,
                        radius: input.radius,
                        isMonitored: input.isMonitored,
                        userId: account.userId,
                    }
                });
                return {
                    status: 'success',
                    data: site,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, site with that siteId already exists!'
                });
            }
        } else {
            // When token is not there, default to session logic
            try {
                const site = await ctx.prisma.site.create({
                    data: {
                        type: input.type,
                        geometry: input.geometry,
                        radius: input.radius,
                        isMonitored: input.isMonitored,
                        userId: ctx.session!.user.id,
                    }
                });
                return {
                    status: 'success',
                    data: site,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, site with that siteId already exists!'
                });
            }
        }
    }),

    getAllSites: protectedProcedure
        .query(async ({ ctx }) => {
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            if (ctx.token) {
                // token logic
                console.log(`The sub is: ${ctx.token.sub}`)
                try {
                    //find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    })
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    //use the account, and find the sites that have userId that we got from account
                    const site = await ctx.prisma.site.findMany({
                        where: {
                            userId: account.userId,
                        }
                    })
                    return {
                        status: 'success',
                        data: site,
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Account Error',
                    });
                }

            } else {
                // session logic
                const userId = ctx.session?.user?.id;
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
            }
        }),

    getSite: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            //token logic
            if (ctx.token) {
                try {
                    //find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    })
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    //use the account, and find the site that has userId that we got from account
                    const site = await ctx.prisma.site.findFirst({
                        where: {
                            userId: account.userId,
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
                            message: 'Cannot find a site with that siteId for the user associated with the token!'
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Account Error',
                    });
                }
            } else {
                //when token is not there, default to session logic
                console.log(`Inside getSite, the sub is ${ctx.token}`)
                try {
                    const site = await ctx.prisma.site.findFirst({
                        where: {
                            id: input.siteId,
                            userId: ctx.session!.user.id
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
                            message: 'Cannot find a site with that siteId for the user associated with the session!'
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Cannot get site',
                    });
                }
            }
        }),

    updateSite: protectedProcedure
        .input(updateSiteSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            // Token logic
            if (ctx.token) {
                try {
                    // Find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    });
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    // Use the account, and find the site that has userId that we got from account
                    const updatedSite = await ctx.prisma.site.update({
                        where: {
                            userId: account.userId,
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
                        code: "NOT_FOUND",
                        message: 'Site with those id does not exist, cannot update site',
                    });
                }
            } else {
                // When token is not there, default to session logic
                console.log(`Inside updateSite, the sub is ${ctx.token}`);
                try {
                    const updatedSite = await ctx.prisma.site.update({
                        where: {
                            id: input.params.siteId,
                            userId: ctx.session!.user.id
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
                        code: "NOT_FOUND",
                        message: 'Site with those id does not exist, cannot update site',
                    });
                }
            }
        }),

    deleteSite: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            try {
                // Token logic
                if (ctx.token) {
                    // Find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        },
                    });
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    // Use the account, and find the site that has userId that we got from account
                    const deletedSite = await ctx.prisma.site.delete({
                        where: {
                            userId: account.userId,
                            id: input.siteId,
                        },
                    });
                    return {
                        status: "success",
                        data: deletedSite,
                    };
                } else {
                    // When token is not there, default to session logic
                    const deletedSite = await ctx.prisma.site.delete({
                        where: {
                            id: input.siteId,
                            userId: ctx.session!.user.id,
                        },
                    });
                    return {
                        status: "success",
                        data: deletedSite,
                    };
                }
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Cannot delete site",
                });
            }
        }),
});


