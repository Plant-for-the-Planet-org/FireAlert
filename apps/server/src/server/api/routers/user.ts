import { TRPCError } from '@trpc/server';
import { updateUserSchema } from '../zodSchemas/user.schema';
import { adminProcedure, createTRPCRouter, protectedProcedure, userProcedure } from '../trpc';
import { checkIfUserIsPlanetRO, fetchProjectsWithSitesForUser, getNameFromPPApi } from "../../../utils/fetch"
import { sendEmail } from '../../../utils/notification/sendEmail';
import { getUser } from '../../../utils/routers/user';
import { Prisma, Project} from '@prisma/client';

export const userRouter = createTRPCRouter({
    profile: userProcedure
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
            const name = await getNameFromPPApi(bearer_token);
            const detectionMethods = JSON.stringify(["MODIS","VIIRS","LANDSAT"])
            if (!user) {
                // SIGNUP FUNCTIONALITY
                // Check if the user requesting access is PlanetRO
                const isPlanetRO = await checkIfUserIsPlanetRO(bearer_token)
                // If not planetRO // create the User
                if (!isPlanetRO) {
                    const result = await ctx.prisma.$transaction(async (prisma) => {
                        const createdUser = await prisma.user.create({
                            data: {
                                sub: ctx.token.sub,
                                isPlanetRO: false,
                                name: name,
                                email: ctx.token["https://app.plant-for-the-planet.org/email"],
                                emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"] ? ctx.token["https://app.plant-for-the-planet.org/email_verified"] : false,
                                lastLogin: new Date(),
                                detectionMethods: detectionMethods,
                            },
                        });
                        const createdAlertMethod = await prisma.alertMethod.create({
                            data: {
                                method: "email",
                                destination: ctx.token["https://app.plant-for-the-planet.org/email"],
                                isVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                                isEnabled: false,
                                userId: createdUser.id,
                            },
                        });
                        return {
                            user: createdUser,
                            alertMethod: createdAlertMethod,
                        };
                    });
                    const { user } = result;
                    return {
                        id: user.id,
                        sub: user.sub,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        isPlanetRO: user.isPlanetRO,
                        lastLogin: user.lastLogin,
                        detectionMethods: user.detectionMethods
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
                                    const geoJsonGeometry = siteGeometry;
                                    // Check if siteType and siteGeometry are not null before proceeding
                                    if (siteType && siteGeometry) {
                                        // Check if siteType and siteGeometry.type are the same
                                        if (siteType === siteGeometry.type) {
                                            siteData.push({
                                                remoteId: siteId,
                                                origin: 'ttc',
                                                name: siteName ?? "",
                                                type: siteType,
                                                geometry: geoJsonGeometry,
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
                    const createdUser = await ctx.prisma.$transaction(async (prisma) => {
                        const user = await prisma.user.create({
                            data: {
                                id: userId,
                                sub: ctx.token.sub,
                                isPlanetRO: true,
                                name: name,
                                email: ctx.token["https://app.plant-for-the-planet.org/email"],
                                emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                                lastLogin: new Date(),
                                detectionMethods: detectionMethods,
                            },
                        });
                        await prisma.alertMethod.create({
                            data: {
                                method: "email",
                                destination: ctx.token["https://app.plant-for-the-planet.org/email"],
                                isVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                                isEnabled: false,
                                userId: user.id,
                            },
                        });
                        await prisma.project.createMany({
                            data: projectData,
                        });
                        await prisma.site.createMany({
                            data: siteData,
                        });
                        return user;
                    });
                    return {
                        id: createdUser.id,
                        sub: createdUser.sub,
                        email: createdUser.email,
                        name: createdUser.name,
                        image: createdUser.image,
                        isPlanetRO: createdUser.isPlanetRO,
                        lastLogin: createdUser.lastLogin,
                        detectionMethods: createdUser.detectionMethods,
                    };
                } else {
                    const user = await ctx.prisma.$transaction(async (prisma) => {
                        const createdUser = await prisma.user.create({
                            data: {
                                sub: ctx.token.sub,
                                isPlanetRO: true,
                                name: name,
                                email: ctx.token["https://app.plant-for-the-planet.org/email"],
                                emailVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"] ? ctx.token["https://app.plant-for-the-planet.org/email_verified"] : false,
                                lastLogin: new Date(),
                                detectionMethods: detectionMethods,
                            },
                        });

                        await prisma.alertMethod.create({
                            data: {
                                method: 'email',
                                destination: ctx.token["https://app.plant-for-the-planet.org/email"],
                                isVerified: ctx.token["https://app.plant-for-the-planet.org/email_verified"],
                                isEnabled: false,
                                userId: createdUser.id,
                            },
                        });

                        return createdUser;
                    });

                    return {
                        id: user.id,
                        sub: user.sub,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        isPlanetRO: user.isPlanetRO,
                        lastLogin: user.lastLogin,
                        detectionMethods: user.detectionMethods,
                    };

                }
            } else {
                // When user is there - LOGIN FUNCTIONALITY
                const updatedUser = await ctx.prisma.$transaction(async (prisma) => {
                    if (user.deletedAt) {
                        await prisma.user.update({
                            where: {
                                email: ctx.token["https://app.plant-for-the-planet.org/email"],
                            },
                            data: {
                                deletedAt: null,
                            },
                        });
                        const emailSubject = 'Restore Deleted FireAlert Account';
                        const emailBody = 'Thank you for logging in to FireAlert. Deletion was canceled as you have logged into your account.';
                        await sendEmail(user.email, emailSubject, emailBody);
                    }
                    await prisma.user.update({
                        where: {
                            email: ctx.token["https://app.plant-for-the-planet.org/email"],
                        },
                        data: {
                            lastLogin: new Date(),
                        },
                    });
                    return user;
                });
                return {
                    id: updatedUser.id,
                    sub: updatedUser.sub,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    image: updatedUser.image,
                    isPlanetRO: updatedUser.isPlanetRO,
                    lastLogin: updatedUser.lastLogin,
                    detectionMethods: updatedUser.detectionMethods,
                };
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

    getUser: protectedProcedure.query(async ({ ctx }) => {
        try {
            const user = await getUser(ctx)
            const returnUser =  {
                    id: user.id,
                    sub: user.sub,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    isPlanetRO: user.isPlanetRO,
                    lastLogin: user.lastLogin,
                    detectionMethods: user.detectionMethods
                };
            return {
                status: 'success',
                data: returnUser
            }
        } catch (error) {
            console.log(error)
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `Cannot find a user`,
            });
        }
    }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            let body:Prisma.UserUpdateInput = {};
            if(input.body.detectionMethods){
                const {detectionMethods, ...rest} = input.body
                body = {
                    detectionMethods: JSON.stringify(detectionMethods),
                    ...rest,
                }
            }else{
                body = input.body
            }
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: body,
                });
                const returnUser =  {
                    id: updatedUser.id,
                    sub: updatedUser.sub,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    image: updatedUser.image,
                    isPlanetRO: updatedUser.isPlanetRO,
                    lastLogin: updatedUser.lastLogin,
                    detectionMethods: updatedUser.detectionMethods
                }
                return {
                    status: 'success',
                    data: returnUser
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    softDeleteUser: protectedProcedure.mutation(async ({ ctx }) => {
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

    syncProjectsAndSite: protectedProcedure
        .mutation(async ({ ctx }) => {
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
                        await ctx.prisma.project.create({
                            data: {
                                id: projectId,
                                userId: userId,
                                lastUpdated: new Date(),
                                name: projectNameFormPP,
                                slug: projectSlugFormPP,
                            },
                        });
                    }
                    // Similarly for each site, find if there are sites that are missing in db, if yes, add that site to db
                    for (const siteFromPP of sitesFromPPProject) {
                        const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP, geometry } = siteFromPP;
                        const geoJsonGeometry = {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": geometry
                                }
                            ]
                        }
                        const radius = 0
                        const type = geometry.type
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
                                    geometry: geoJsonGeometry,
                                    radius: radius,
                                    userId: userId,
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
                                    geometry: geoJsonGeometry,
                                    radius: radius,
                                    lastUpdated: siteLastUpdatedFromPP.date,
                                },
                            });
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
                }
            }
        })
});

export type UserRouter = typeof userRouter;
