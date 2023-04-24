import { TRPCError } from "@trpc/server";
import { updateUserSchema } from '../zodSchemas/user.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { Alert, Site } from "@prisma/client";
import { getUserIdByToken } from "../../../utils/token";

const checkIfUserIsPlanetRO = async (bearer_token: string) => {
    // send a request to https://app.plant-for-the-planet.org/app/profile with authorization headers of Bearer token using bearer_token
    // Check the response the the above request for type = "tpo"
    // If yes return true, else return false
    const response = await fetch(
        "https://app.plant-for-the-planet.org/app/profile",
        {
            headers: {
                Authorization: bearer_token,
            },
        }
    );
    const data = await response.json();
    return data.type === "tpo";
}

const fetchProjectsWithSitesForUser = async (bearer_token: string) => {
    // fetch data from https://app.plant-for-the-planet.org/app/profile/projects?_scope=sites with authorization headers of Bearer token using bearer_token
    // This results an array of projects which has sites key to it which contains an array of sites
    // return this list
    const response = await fetch(
        "https://app.plant-for-the-planet.org/app/profile/projects?_scope=sites",
        {
            headers: {
                Authorization: bearer_token,
            },
        }
    );
    const data = await response.json();
    return data;
}

export const userRouter = createTRPCRouter({

    profile: protectedProcedure
        .mutation(async ({ ctx }) => {
            // Get the access token
            const access_token = ctx.token.access_token
            const bearer_token = "Bearer " + access_token
            // check if this user already exists in the database // If yes, throw a TRPC Error
            const user = await ctx.prisma.user.findFirst({
                where: {
                    guid: ctx.token.sub
                }
            })
            if (!user) {
                // SIGNUP FUNCTIONALITY
                // Check if the user requesting access is PlanetRO
                const isPlanetRO = await checkIfUserIsPlanetRO(bearer_token)
                // If not planetRO // create the User
                if (!isPlanetRO) {
                    const user = await ctx.prisma.user.create({
                        data: {
                            guid: ctx.token.sub,
                            isPlanetRO: false,
                            name: ctx.token["https://app.plant-for-the-planet.org/email"],
                            email: ctx.token["https://app.plant-for-the-planet.org/email"],
                            emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                        }
                    })
                    return {
                        status: "success",
                        data: user,
                    };
                }
                // Else, create user, create project, and create sites associated with that user in the pp.
                const projects = await fetchProjectsWithSitesForUser(bearer_token)
                // Add each project to the database, with siteId and UserId
                // For each sites in each project, add the site in the database.
                // For each project, filter out the sites in that project with siteId, geometry, type, radius. 
                let userId;
                for (const project of projects) {
                    const { sites, id: projectId, lastUpdatedForProject, name: projectName, slug: projectSlug } = project;
                    userId = project.tpo.id
                    for (const site of sites) {
                        const { geometry, type, radius } = site;
                        const { id: siteId, lastUpdatedForSite } = site.properties;
                        await ctx.prisma.site.create({
                            data: {
                                id: siteId,
                                type: type,
                                geometry: geometry,
                                radius: radius,
                                userId: userId,
                                projectId: projectId,
                                lastUpdated: lastUpdatedForSite.date,
                            },
                        });
                    }
                    await ctx.prisma.project.create({
                        data: {
                            name: projectName,
                            slug: projectSlug,
                            userId: userId,
                            id: projectId,
                            lastUpdated: lastUpdatedForProject,
                        }
                    })
                }
                // Finally add the user to the database with isPlanetRO set to True
                const createdUser = await ctx.prisma.user.create({
                    data: {
                        id: userId,
                        guid: ctx.token.sub,
                        isPlanetRO: true,
                        name: ctx.token["https://app.plant-for-the-planet.org/email"],
                        email: ctx.token["https://app.plant-for-the-planet.org/email"],
                        emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                    }
                })
                return {
                    status: "success",
                    data: {
                        user: createdUser
                    },
                };
            } else {
                // LOGIN FUNCTIONALITY
                if (user.deletedAt) {
                    await ctx.prisma.user.update({
                        where: {
                            guid: ctx.token.sub
                        },
                        data: {
                            deletedAt: null
                        }
                    })
                }
                // then check to see if PlanetRO is true for this user or not
                // If not planet RO: fetch all the sites, projects, alertMethods, alerts associated with the user from the database and return
                if (user.isPlanetRO) {
                    // If yes planetRO, check if the lastUpdated for the site and projects in our database associated with this user has been changed when fetching or not
                    const projectsFromPP = await fetchProjectsWithSitesForUser(bearer_token)
                    for (const projectFromPP of projectsFromPP) {
                        const { sites: sitesFromPPProject, id: projectId, lastUpdated: projectLastUpdatedFormPP, name: projectNameFormPP, slug: projectSlugFormPP } = projectFromPP;
                        const tpoId = projectFromPP.tpo.id
                        const projectFromDatabase = await ctx.prisma.project.findFirst({
                            where: {
                                id: projectId
                            }
                        })
                        if (!projectFromDatabase) {
                            // Add that new project from pp to database
                            await ctx.prisma.project.create({
                                data: {
                                    id: projectId,
                                    userId: user.id,
                                    lastUpdated: projectLastUpdatedFormPP,
                                    name: projectNameFormPP,
                                    slug: projectSlugFormPP,
                                },
                            });
                        }
                        const sitesFromDBProject = await ctx.prisma.site.findMany({
                            where: {
                                projectId: projectId,
                            }
                        })
                        const siteIdsFromPP = sitesFromPPProject.map(site => site.properties.id);
                        for (const siteFromDB of sitesFromDBProject) {
                            if (!siteIdsFromPP.includes(siteFromDB.id)) {
                                await ctx.prisma.site.update({
                                    where: {
                                        id: siteFromDB.id,
                                    },
                                    data: {
                                        deletedAt: new Date(),
                                        projectId: null
                                    }
                                });
                            }
                        }
                        // I need to find if there are any sitesFromDBProject that needs to be deleted, if it is missing from sitesFromPPProject
                        // If there is a project, and last updated has changed, update the entire site and projects
                        if (projectFromDatabase!.lastUpdated !== projectLastUpdatedFormPP) {
                            await ctx.prisma.project.update({
                                where: {
                                    id: projectId
                                },
                                data: {
                                    lastUpdated: projectLastUpdatedFormPP,
                                    name: projectNameFormPP,
                                    slug: projectSlugFormPP,
                                }
                            })
                            for (const siteFromPP of sitesFromPPProject) {
                                const { geometry, type, radius } = siteFromPP;
                                const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP } = siteFromPP.properties;
                                const siteFromDatabase = await ctx.prisma.site.findUnique({
                                    where: {
                                        id: siteIdFromPP,
                                    }
                                })
                                if (!siteFromDatabase) {
                                    // create a new site based on the info
                                    await ctx.prisma.site.create({
                                        data: {
                                            type: type,
                                            geometry: geometry,
                                            radius: radius,
                                            userId: tpoId,
                                            projectId: projectId,
                                            lastUpdated: siteLastUpdatedFromPP.date,
                                        },
                                    });
                                } else if (siteFromDatabase.lastUpdated !== siteLastUpdatedFromPP.date) {
                                    await ctx.prisma.site.update({
                                        where: {
                                            id: siteIdFromPP
                                        },
                                        data: {
                                            type: type,
                                            geometry: geometry,
                                            radius: radius,
                                            userId: tpoId,
                                            lastUpdated: siteLastUpdatedFromPP.date,
                                        },
                                    });
                                }
                            }
                        }
                    }
                    const projectsFromDB = await ctx.prisma.project.findMany({
                        where: {
                            userId: user.id,
                        }
                    })
                    const projectIdsFromPP = projectsFromPP.map(project => project.id);
                    for (const projectFromDB of projectsFromDB) {
                        if (!projectIdsFromPP.includes(projectFromDB.id)) {
                            await ctx.prisma.project.delete({
                                where: {
                                    id: projectFromDB.id,
                                },
                            });
                            await ctx.prisma.site.updateMany({
                                where: {
                                    projectId: projectFromDB.id
                                },
                                data: {
                                    deletedAt: new Date(),
                                    projectId: null,
                                }
                            })
                        }
                    }
                }
                return {
                    status: "success",
                    data: {
                        user
                    },
                }
            }
        }),


    getAllUsers: protectedProcedure // TODO: make this admin procedure
        .query(async ({ ctx }) => {
            try {
                const users = await ctx.prisma.user.findMany()
                return {
                    status: 'success',
                    data: users,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: 'Users Not found',
                });
            }
        }),

    getUser: protectedProcedure
        .query(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const user = await ctx.prisma.user.findFirst({
                    where: {
                        id: userId
                    }
                })
                if (user) {
                    return {
                        status: 'success',
                        data: user,
                    }
                } else {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Cannot find a user with that userId!`
                    });
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Cannot get user',
                });
            }
        }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: userId
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
                    code: "INTERNAL_SERVER_ERROR",
                    message: 'An error occurred while updating the user',
                });
            }
        }),

    softDeleteUser: protectedProcedure
        .mutation(async ({ ctx }) => {
            const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User ID not found",
                });
            }
            try {
                const deletedUser = await ctx.prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        deletedAt: new Date()
                    }
                })
                return {
                    status: 'success',
                    data: deletedUser
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An error occured while deleting the user'
                });
            }
        }),
});

export type UserRouter = typeof userRouter


