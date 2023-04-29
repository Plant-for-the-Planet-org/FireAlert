import { TRPCError } from '@trpc/server';
import { updateUserSchema } from '../zodSchemas/user.schema';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { getUserIdByToken } from '../../../utils/token';
import { checkIfUserIsPlanetRO, fetchProjectsWithSitesForUser, getNameFromPPApi } from "../../../utils/fetch"

export const userRouter = createTRPCRouter({
    profile: protectedProcedure
        .query(async ({ ctx }) => {
            // Get the access token
            const access_token = ctx.token.access_token
            const bearer_token = "Bearer " + access_token
            // check if this user already exists in the database
            const user = await ctx.prisma.user.findFirst({
                where: {
                    email: ctx.token["https://app.plant-for-the-planet.org/email"]
                }
            })
            const { name = '' } = await getNameFromPPApi(bearer_token);
            if (!user) {
                // SIGNUP FUNCTIONALITY
                // Check if the user requesting access is PlanetRO
                const isPlanetRO = await checkIfUserIsPlanetRO(bearer_token)
                console.log(`Is planet Ro: ${isPlanetRO}`)
                // If not planetRO // create the User
                if (!isPlanetRO) {
                    const user = await ctx.prisma.user.create({
                        data: {
                            guid: ctx.token.sub,
                            isPlanetRO: false,
                            name: name,
                            email: ctx.token["https://app.plant-for-the-planet.org/email"],
                            emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                            lastLogin: new Date(),
                        }
                    })
                    return {
                        id: user.id,
                        guid: user.guid,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        isPlanetRO: user.isPlanetRO,
                        lastLogin: user.lastLogin,
                    };
                }
                // Else, create user, create project, and create sites associated with that user in the pp.
                const projects = await fetchProjectsWithSitesForUser(bearer_token)
                // If new user is planetRO and has projects
                if (projects.length > 0) {
                    // Find the tpo id and use that as userId
                    const userId = projects[0].properties.tpo.id
                    // First create a user with the userId from tpo, to protect from foreign key constraint
                    const createdUser = await ctx.prisma.user.create({
                        data: {
                            id: userId,
                            guid: ctx.token.sub,
                            isPlanetRO: true,
                            name: name,
                            email: ctx.token["https://app.plant-for-the-planet.org/email"],
                            emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                            lastLogin: new Date(),
                        }
                    })
                    // Then add all the projects and sites associated with that user in the database
                    for (const project of projects) {
                        const { id: projectId, name: projectName, slug: projectSlug, sites } = project.properties;
                        // Create project first
                        await ctx.prisma.project.create({
                            data: {
                                name: projectName,
                                slug: projectSlug,
                                userId: userId,
                                id: projectId,
                                lastUpdated: new Date(),
                            }
                        })
                        for (const site of sites) {
                            const { id: siteId, name: siteName, geometry: siteGeometry } = site;
                            const siteType = siteGeometry.type;
                            const siteRadius = 'Inside'
                            // Then create sites
                            await ctx.prisma.site.create({
                                data: {
                                    id: siteId,
                                    name: siteName,
                                    type: siteType,
                                    geometry: siteGeometry,
                                    radius: siteRadius,
                                    userId: userId,
                                    projectId: projectId,
                                    lastUpdated: new Date(),
                                },
                            });
                        }
                    }
                    return {
                        id: createdUser.id,
                        guid: createdUser.guid,
                        email: createdUser.email,
                        name: createdUser.name,
                        avatar: createdUser.avatar,
                        isPlanetRO: createdUser.isPlanetRO,
                        lastLogin: createdUser.lastLogin,
                    };
                } else {
                    // When new user is planetRO but doesn't have any projects
                    const user = await ctx.prisma.user.create({
                        data: {
                            guid: ctx.token.sub,
                            isPlanetRO: true,
                            name: name,
                            email: ctx.token["https://app.plant-for-the-planet.org/email"],
                            emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                            lastLogin: new Date(),
                        }
                    })
                    return {
                        id: user.id,
                        guid: user.guid,
                        email: user.email,
                        name: user.name,
                        avatar: user.avatar,
                        isPlanetRO: user.isPlanetRO,
                        lastLogin: user.lastLogin,
                    };
                }
            } else {
                // When user is there - LOGIN FUNCTIONALITY
                if (user.deletedAt) {
                    await ctx.prisma.user.update({
                        where: {
                            email: ctx.token["https://app.plant-for-the-planet.org/email"]
                        },
                        data: {
                            deletedAt: null,
                        }
                    })
                }
                await ctx.prisma.user.update({
                    where: {
                        email: ctx.token["https://app.plant-for-the-planet.org/email"]
                    },
                    data: {
                        lastLogin: new Date(),
                    }
                })
                return {
                    id: user.id,
                    guid: user.guid,
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar,
                    isPlanetRO: user.isPlanetRO,
                    lastLogin: user.lastLogin,
                };
            }
        }),
        
    getAllUsers: protectedProcedure // TODO: make this admin procedure
        .query(async ({ ctx }) => {
            try {
                const users = await ctx.prisma.user.findMany();
                return {
                    status: 'success',
                    data: users,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Users Not found',
                });
            }
        }),

    getUser: protectedProcedure.query(async ({ ctx, input }) => {
        const userId = ctx.token
            ? await getUserIdByToken(ctx)
            : ctx.session?.user?.id;
        if (!userId) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User ID not found',
            });
        }
        try {
            const user = await ctx.prisma.user.findFirst({
                where: {
                    id: userId,
                },
            });
            if (user) {
                return {
                    status: 'success',
                    data: user,
                };
            } else {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Cannot find a user with that userId!`,
                });
            }
        } catch (error) {
            console.log(error);
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Cannot get user',
            });
        }
    }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token
                ? await getUserIdByToken(ctx)
                : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User ID not found',
                });
            }
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: input.body,
                });
                return {
                    status: 'success',
                    data: updatedUser,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occurred while updating the user',
                });
            }
        }),

    softDeleteUser: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.token
            ? await getUserIdByToken(ctx)
            : ctx.session?.user?.id;
        if (!userId) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User ID not found',
            });
        }
        try {
            const deletedUser = await ctx.prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    deletedAt: new Date(),
                },
            });
            return {
                status: 'success',
                data: deletedUser,
            };
        } catch (error) {
            console.log(error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occured while deleting the user',
            });
        }
    }),
});

export type UserRouter = typeof userRouter;
