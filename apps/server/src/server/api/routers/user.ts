import { TRPCError } from '@trpc/server';
import { updateUserSchema } from '../zodSchemas/user.schema';
import { adminProcedure, createTRPCRouter, protectedProcedure, userProcedure } from '../trpc';
import { checkIfUserIsPlanetRO, fetchProjectsWithSitesForUser, getNameFromPPApi } from "../../../utils/fetch"
import { sendEmail } from '../../../utils/notification/sendEmail';
import { getUser, createUserInPrismaTransaction, returnUser } from '../../../utils/routers/user';
import { createAlertMethodInPrismaTransaction } from '../../../utils/routers/alertMethod';
import { Prisma, Project } from '@prisma/client';

export const userRouter = createTRPCRouter({
    profile: userProcedure
        .query(async ({ ctx }) => {
            // Get the access token
            const access_token = ctx.token.access_token
            const bearer_token = "Bearer " + access_token
            // check if this user already exists in the database
            const user = await ctx.prisma.user.findFirst({
                where: {
                    sub: ctx.token.sub
                }
            });
            const name = await getNameFromPPApi(bearer_token);
            const detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[] = ["MODIS", "VIIRS", "LANDSAT"]
            if (!user) {
                // SIGNUP FUNCTIONALITY
                // Check if the user requesting access is PlanetRO
                const isPlanetRO = await checkIfUserIsPlanetRO(bearer_token)
                // If not planetRO // create the User
                if (!isPlanetRO) {
                    const result = await ctx.prisma.$transaction(async (prisma) => {
                        const createdUser = await createUserInPrismaTransaction({ prisma, ctx, name, isPlanetRO: false, detectionMethods })
                        const createdAlertMethod = await createAlertMethodInPrismaTransaction({ prisma, ctx, method: "email", isEnabled: false, userId: createdUser.id })
                        return {
                            user: createdUser,
                            alertMethod: createdAlertMethod,
                        };
                    });
                    const { user } = result;
                    const createdUser = returnUser(user)
                    return {
                        status: 'success',
                        data: createdUser
                    };
                }
                // Else, create user, create project, and create sites associated with that user in the pp.
                const projects = await fetchProjectsWithSitesForUser(bearer_token)
                // If new user is planetRO and has projects
                if (projects.length > 0) {
                    // Find the tpo id and use that as userId
                    const userId = projects[0].properties.tpo.id;
                    // Collect project and site data for bulk creation
                    const projectData: Project[] = [];
                    const siteData: Prisma.SiteCreateManyInput[] = [];
                    for (const project of projects) {
                        const { id: projectId, name: projectName, slug: projectSlug, sites } = project.properties;

                        projectData.push({
                            id: projectId,
                            name: projectName ?? "",
                            slug: projectSlug ?? "",
                            userId: userId,
                            lastUpdated: new Date(),
                        });

                        if (sites) {
                            for (const site of sites) {
                                if (site) {
                                    const { id: siteId, name: siteName, geometry: siteGeometry } = site;
                                    const siteType = siteGeometry?.type || null; // Use null as the fallback value if siteGeometry is null or undefined
                                    const siteRadius = 0;
                                    // Check if siteType and siteGeometry are not null before proceeding
                                    if (siteType && siteGeometry) {
                                        // Check if siteType and siteGeometry.type are the same
                                        if (siteType === siteGeometry.type) {
                                            siteData.push({
                                                remoteId: siteId,
                                                origin: 'ttc',
                                                name: siteName ?? "",
                                                type: siteType,
                                                geometry: siteGeometry,
                                                radius: siteRadius,
                                                userId: userId,
                                                projectId: projectId,
                                                lastUpdated: new Date(),
                                            });
                                        }
                                    } else {
                                        // Handle the case where geometry or type is null
                                        console.log(`Skipping site with id ${siteId} due to null geometry or type.`);
                                    }
                                }
                            }
                        }
                    }
                    // Create user and alert method in a transaction
                    const result = await ctx.prisma.$transaction(async (prisma) => {
                        const createdUser = await createUserInPrismaTransaction({ id: userId, prisma, ctx, name: name, isPlanetRO: true, detectionMethods: detectionMethods })
                        const createdAlertMethod = await createAlertMethodInPrismaTransaction({ prisma, ctx, method: "email", isEnabled: false, userId: createdUser.id })
                        const projects = await prisma.project.createMany({
                            data: projectData,
                        });
                        const sites = await prisma.site.createMany({
                            data: siteData,
                        });
                        return {
                            user: createdUser,
                            alertMethod: createdAlertMethod,
                            projectsCount: projects.count,
                            sitesCount: sites.count,
                        };
                    });
                    const { user, alertMethod, projectsCount, sitesCount } = result;
                    const createdUser = returnUser(user)
                    return {
                        status: 'success',
                        data: createdUser,
                        message: `Successfully created User, Alert Method and added ${sitesCount} sites for ${projectsCount} projects`
                    };
                } else {
                    const result = await ctx.prisma.$transaction(async (prisma) => {
                        const createdUser = await createUserInPrismaTransaction({ prisma, ctx, name: name, isPlanetRO: true, detectionMethods: detectionMethods })
                        const createdAlertMethod = await createAlertMethodInPrismaTransaction({ prisma, ctx, method: "email", isEnabled: false, userId: createdUser.id })
                        return {
                            user: createdUser,
                            alertMethod: createdAlertMethod,
                        };
                    });
                    const { user } = result;
                    const createdUser = returnUser(user)
                    return {
                        status: 'success',
                        data: createdUser
                    }
                }
            } else {
                // When user is there - LOGIN FUNCTIONALITY
                try {
                    if (user.deletedAt) {
                        await ctx.prisma.user.update({
                            where: {
                                sub: ctx.token.sub,
                            },
                            data: {
                                deletedAt: null,
                            },
                        });
                        const emailSubject = 'Restore Deleted FireAlert Account';
                        const emailBody = 'Thank you for logging in to FireAlert. Deletion was canceled as you have logged into your account.';
                        await sendEmail(user.email, emailSubject, emailBody);
                    }
                    const returnedUser = await ctx.prisma.user.update({
                        where: {
                            sub: ctx.token.sub,
                        },
                        data: {
                            lastLogin: new Date(),
                        },
                    });
                    const loggedInUser = returnUser(returnedUser);
                return {
                    status: 'success',
                    data: loggedInUser,
                };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `${error}`,
                    });
                }
            }
        }),

    getAllUsers: adminProcedure
        .query(async ({ ctx }) => {
            try {
                const users = await ctx.prisma.user.findMany();
                return {
                    status: 'success',
                    data: users,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            let body: Prisma.UserUpdateInput = {};
            if (input.body.detectionMethods) {
                const { detectionMethods, ...rest } = input.body
                body = {
                    detectionMethods: detectionMethods,
                    ...rest,
                }
            } else {
                body = input.body
            }
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: body,
                });
                const returnedUser = returnUser(updatedUser)
                return {
                    status: 'success',
                    data: returnedUser
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    softDeleteUser: protectedProcedure
        .mutation(async ({ ctx }) => {
            const user = await getUser(ctx)
            try {
                const deletedUser = await ctx.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        deletedAt: new Date(),
                    },
                });
                if (!deletedUser) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `Error in deletion process. Cannot delete user`,
                    });
                } else {
                    const emailSubject = 'Soft Delete Fire Alert Account'
                    const emailBody = 'You have successfully deleted your account. Your account will be scheduled for deletion, and will be deleted in 7 days. If you change your mind, please log in again within 7 days to cancel the deletion.'
                    const emailSent = await sendEmail(deletedUser.email, emailSubject, emailBody)
                    return {
                        status: 'Success',
                        message: `Soft deleted user ${deletedUser.name}. User will be permanently deleted in 7 days. ${emailSent ? 'Successfully sent email' : ''}`,
                    };
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    syncProjectsAndSites: protectedProcedure
        .query(async ({ ctx }) => {
            // Get the access token
            const access_token = ctx.token.access_token
            const bearer_token = "Bearer " + access_token
            // check if this user already exists in the database and has not been soft deleted
            const user = await getUser(ctx)
            // then check to see if PlanetRO is true for this user or not
            if (user.isPlanetRO) {
                // If yes planetRO, check if any new projects or sites have been added for this user or not
                const projectsFromPP = await fetchProjectsWithSitesForUser(bearer_token)
                const projectsFromDB = await ctx.prisma.project.findMany({
                    where: {
                        userId: user.id,
                    }
                })
                const result = await ctx.prisma.$transaction(async (prisma) => {
                    const createPromises = [];
                    const updatePromises = [];
                    const deletePromises = [];
                    const projectIdsFromPP = projectsFromPP.map(project => project.id);
                    for (const projectFromDB of projectsFromDB) {
                        if (!projectIdsFromPP.includes(projectFromDB.id)) {
                            deletePromises.push(
                                prisma.project.delete({
                                    where: {
                                        id: projectFromDB.id,
                                    },
                                })
                            )
                            updatePromises.push(
                                prisma.site.updateMany({
                                    where: {
                                        projectId: projectFromDB.id
                                    },
                                    data: {
                                        deletedAt: new Date(),
                                        projectId: null,
                                    }
                                })
                            )
                        }
                    }
                    for (const projectFromPP of projectsFromPP) {
                        const { id: projectId, name: projectNameFormPP, slug: projectSlugFormPP, sites: sitesFromPPProject } = projectFromPP.properties;
                        const userId = user.id;
                        // See if the project exists in db
                        const projectFromDatabase = await ctx.prisma.project.findFirst({
                            where: {
                                id: projectId
                            }
                        })
                        // If project does not exist, create project
                        if (!projectFromDatabase) {
                            // Add that new project from pp to database
                            createPromises.push(
                                prisma.project.create({
                                    data: {
                                        id: projectId,
                                        userId: userId,
                                        lastUpdated: new Date(),
                                        name: projectNameFormPP,
                                        slug: projectSlugFormPP,
                                    },
                                })
                            )
                        }
                        // Similarly for each site, find if there are sites that are missing in db, if yes, add that site to db
                        for (const siteFromPP of sitesFromPPProject) {
                            const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP, geometry } = siteFromPP;
                            const radius = 0
                            const type = geometry.type
                            const siteFromDatabase = await ctx.prisma.site.findUnique({
                                where: {
                                    id: siteIdFromPP,
                                }
                            })
                            if (!siteFromDatabase) {
                                // create a new site based on the info
                                createPromises.push(
                                    prisma.site.create({
                                        data: {
                                            type: type,
                                            geometry: geometry,
                                            radius: radius,
                                            userId: userId,
                                            projectId: projectId,
                                            lastUpdated: siteLastUpdatedFromPP.date,
                                        },
                                    })
                                )
                            } else if (siteFromDatabase.lastUpdated !== siteLastUpdatedFromPP.date) {
                                updatePromises.push(
                                    prisma.site.update({
                                        where: {
                                            id: siteIdFromPP
                                        },
                                        data: {
                                            type: type,
                                            geometry: geometry,
                                            radius: radius,
                                            lastUpdated: siteLastUpdatedFromPP.date,
                                        },
                                    })
                                )
                            }
                        }
                        // Find all the sites with that projectId in DB
                        const sitesFromDBProject = await ctx.prisma.site.findMany({
                            where: {
                                projectId: projectId,
                            }
                        })
                        const siteIdsFromPP = sitesFromPPProject.map(site => site.properties.id);
                        // If there are any sites that has been deleted in PP, make it's projectId as null, and add deletedAt
                        for (const siteFromDB of sitesFromDBProject) {
                            if (!siteIdsFromPP.includes(siteFromDB.id)) {
                                updatePromises.push(
                                    prisma.site.update({
                                        where: {
                                            id: siteFromDB.id,
                                        },
                                        data: {
                                            deletedAt: new Date(),
                                            projectId: null
                                        }
                                    })
                                )
                            }
                        }
                    }
                    const createResults = await Promise.all(createPromises);
                    const updateResults = await Promise.all(updatePromises);
                    const deleteResults = await Promise.all(deletePromises);

                    return { created: createResults, updated: updateResults, deleted: deleteResults }
                })
                const { created, updated, deleted } = result
                const createCount = created.length; // Number of created items
                const updateCount = updated.length; // Number of updated items
                const deleteCount = deleted.length; // Number of deleted items

                return { created: createCount, updated: updateCount, deleted: deleteCount };
            } else {
                throw new TRPCError({
                    code: "METHOD_NOT_SUPPORTED",
                    message: `Only PlanetRO users can sync projects and site to the planet webapp`,
                });
            }
        }),
});

export type UserRouter = typeof userRouter;
