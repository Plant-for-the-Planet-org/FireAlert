import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { checkIfUserIsPlanetRO, fetchProjectsWithSitesForUser, fetchAllProjectsWithSites } from "../../../utils/fetch"
import { subtractDays } from "../../../utils/date"
import { makeDetectionCoordinates } from "../../../utils/turf";




// TODO: add detectionCoordinates in updateROProjectsAndSitesForOneUser procedures?
// TODO: add updateSite logic in updateROProjectsAndSitesForOneUser procedure
// TODO: test all three procedures
export const periodicCallRouter = createTRPCRouter({

    updateROProjectsAndSitesForAllUsers: publicProcedure
        .mutation(async ({ ctx }) => {
            // Get all the projects from PP
            const projectsFromPP = await fetchAllProjectsWithSites()
            // Get all projects from DB
            const projectsFromDB = await ctx.prisma.project.findMany()
            // Filter PP list to only contain projects that are in DB
            const ppListFiltered = projectsFromPP.filter(
                (projectFromPP) =>
                    projectsFromDB.some((projectFromDB) => projectFromDB.id === projectFromPP.id)
            );
            // Check for projects in DB that are not in PP and delete them
            const dbProjectsIds = projectsFromDB.map((project) => project.id);
            const projectsIdsToDelete = dbProjectsIds.filter(
                (projectId) => !ppListFiltered.some((project) => project.id === projectId)
            );
            if (projectsIdsToDelete.length) {
                await ctx.prisma.site.updateMany({
                    where: {
                        projectId: {
                            in: projectsIdsToDelete,
                        },
                    },
                    data: {
                        deletedAt: new Date(),
                        projectId: null
                    }
                });
                await ctx.prisma.project.deleteMany({
                    where: {
                        id: {
                            in: projectsIdsToDelete,
                        },
                    },
                });
            }
            // Loop through the PPList and check if a project in DB has the same id and lastUpdated value
            for (const projectFromPP of ppListFiltered) {
                const {
                    sites: sitesFromPPProject,
                    id: projectId,
                    lastUpdated: projectLastUpdatedFormPP,
                    name: projectNameFormPP,
                    slug: projectSlugFormPP,
                } = projectFromPP;
                const projectFromDatabase = await ctx.prisma.project.findFirst({
                    where: {
                        id: projectId,
                    },
                });
                if (projectFromDatabase!.lastUpdated !== projectLastUpdatedFormPP) {
                    // If there is a project, and last updated has changed, update the entire project and sites
                    await ctx.prisma.project.update({
                        where: {
                            id: projectId,
                        },
                        data: {
                            lastUpdated: projectLastUpdatedFormPP,
                            name: projectNameFormPP,
                            slug: projectSlugFormPP,
                        },
                    });
                    const tpoId = projectFromPP.tpo.id;
                    const sitesFromDBProject = await ctx.prisma.site.findMany({
                        where: {
                            projectId: projectId,
                        },
                    });
                    const siteIdsFromPP = sitesFromPPProject.map((site) => site.properties.id);
                    // Loop through sites in DB and delete sites not found in PP
                    for (const siteFromDBProject of sitesFromDBProject) {
                        if (!siteIdsFromPP.includes(siteFromDBProject.id)) {
                            await ctx.prisma.site.update({
                                where: {
                                    id: siteFromDBProject.id,
                                },
                                data: {
                                    projectId: null,
                                    deletedAt: new Date(),
                                }
                            });
                        }
                    }
                    // Loop through sites in PP and update or create new sites in DB
                    for (const siteFromPP of sitesFromPPProject) {
                        const { geometry, type, radius } = siteFromPP;
                        const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP } = siteFromPP.properties;
                        const siteFromDatabase = await ctx.prisma.site.findUnique({
                            where: {
                                id: siteIdFromPP,
                            }
                        })
                        const detectionCoordinates = makeDetectionCoordinates(geometry, radius);
                        if (!siteFromDatabase) {
                            // create a new site based on the info
                            await ctx.prisma.site.create({
                                data: {
                                    type: type,
                                    geometry: geometry,
                                    radius: radius,
                                    detectionCoordinates: detectionCoordinates,
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
                                    detectionCoordinates: detectionCoordinates,
                                    lastUpdated: siteLastUpdatedFromPP.date,
                                },
                            });
                        }
                    }
                }
            }
        }),

    permanentlyDeleteUsers: publicProcedure
        // Permanently deletes users who have been temporarily deleted for more than 14 days
        .mutation(async ({ ctx }) => {
            const usersToDelete = await ctx.prisma.user.findMany({
                where: {
                    deletedAt: {
                        not: null,
                        lt: subtractDays(new Date(), 14),
                    },
                },
                select: {
                    id: true,
                },
            });
            const userIdsToDelete = usersToDelete.map((user) => user.id);
            if (userIdsToDelete.length > 0) {
                await ctx.prisma.site.deleteMany({
                    where: {
                        userId: {
                            in: userIdsToDelete,
                        }
                    }
                });
                await ctx.prisma.alertMethod.deleteMany({
                    where: {
                        userId: {
                            in: userIdsToDelete,
                        }
                    }
                });
                await ctx.prisma.project.deleteMany({
                    where: {
                        userId: {
                            in: userIdsToDelete,
                        }
                    }
                });
                await ctx.prisma.user.deleteMany({
                    where: {
                        id: {
                            in: userIdsToDelete,
                        },
                    },
                });
            }
            return { success: true };
        }),

    updateProjectsAndSiteForOneUser: protectedProcedure
        .mutation(async ({ ctx }) => {
            // Get the access token
            const access_token = ctx.token.access_token
            const bearer_token = "Bearer " + access_token
            // check if this user already exists in the database
            const user = await ctx.prisma.user.findFirst({
                where: {
                    email: ctx.token["https://app.plant-for-the-planet.org/email"]
                }
            })
            // then check to see if PlanetRO is true for this user or not
            if (user!.isPlanetRO) {
                // If yes planetRO, check if any new projects or sites have been added for this user or not
                const projectsFromPP = await fetchProjectsWithSitesForUser(bearer_token)
                const projectsFromDB = await ctx.prisma.project.findMany({
                    where: {
                        userId: user!.id,
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
                        const radius = 'inside'
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
                                    userId: userId,
                                    projectId: projectId,
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

})