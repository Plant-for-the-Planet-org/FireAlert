import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

const fetchAllProjectsWithSites = async () => {
    const response = await fetch("https://app-staging.plant-for-the-planet.org/app/projects?_scope=extended");
    const data = await response.json();
    return data;
}

export const periodicCallRouter = createTRPCRouter({

    updateROProjectsAndSites: publicProcedure
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
                                    lastUpdated: siteLastUpdatedFromPP.date,
                                },
                            });
                        }
                    }
                }
            }
        }),
})