import {TRPCError} from '@trpc/server';
import {createTRPCRouter, publicProcedure} from '../trpc';
import {fetchAllProjectsWithSites} from '../../../utils/fetch';
import {subtractDays} from '../../../utils/date';

// TODO: test all three procedures
export const cronRouter = createTRPCRouter({
  // TODO: debug the variables when fetched from pp
  syncProjectsAndSitesForAllROUsers: publicProcedure.mutation(async ({ctx}) => {
    // Get all the projects from PP
    const projectsFromPP = await fetchAllProjectsWithSites();
    // Get all projects from DB, and only ROs have projects, normal user cannot make projects
    const projectsFromDB = await ctx.prisma.project.findMany();
    // Filter PP list to only contain projects that are in DB
    const ppListFiltered = projectsFromPP.filter(projectFromPP =>
      projectsFromDB.some(
        projectFromDB => projectFromDB.id === projectFromPP.id,
      ),
    );

    // Check for projects in DB that are not in PP and delete them
    const dbProjectsIds = projectsFromDB.map(project => project.id);
    const projectsIdsToDelete = dbProjectsIds.filter(
      projectId => !ppListFiltered.some(project => project.id === projectId),
    );

    if (projectsIdsToDelete.length) {
      await ctx.prisma.$transaction(async prisma => {
        await prisma.site.updateMany({
          where: {
            projectId: {
              in: projectsIdsToDelete,
            },
          },
          data: {
            deletedAt: new Date(),
            projectId: null,
          },
        });

        await prisma.project.deleteMany({
          where: {
            id: {
              in: projectsIdsToDelete,
            },
          },
        });
      });
    }

    // Create a mapping of project IDs to project lastUpdated values from PP
    const ppProjectLastUpdatedMap = new Map();
    for (const projectFromPP of ppListFiltered) {
      ppProjectLastUpdatedMap.set(projectFromPP.id, projectFromPP.lastUpdated);
    }

    // Fetch all sites from the DB for the projects in ppListFiltered
    const dbSites = await ctx.prisma.site.findMany({
      where: {
        projectId: {
          in: ppListFiltered.map(project => project.id),
        },
      },
    });

    // Create a mapping of site IDs to site lastUpdated values from PP
    const ppSiteLastUpdatedMap = new Map();
    for (const projectFromPP of ppListFiltered) {
      for (const siteFromPP of projectFromPP.sites) {
        ppSiteLastUpdatedMap.set(
          siteFromPP.properties.id,
          siteFromPP.properties.lastUpdated.date,
        );
      }
    }

    // Perform bulk creations, bulk updates, and bulk deletions for sites
    await ctx.prisma.$transaction(async prisma => {
      const createPromises = [];
      const updatePromises = [];
      const deletePromises = [];

      for (const dbSite of dbSites) {
        if (!ppSiteLastUpdatedMap.has(dbSite.id)) {
          // Site not found in PP, delete it
          deletePromises.push(
            prisma.site.update({
              where: {
                id: dbSite.id,
              },
              data: {
                projectId: null,
                deletedAt: new Date(),
              },
            }),
          );
        }
      }

      for (const projectFromPP of ppListFiltered) {
        const {
          sites: sitesFromPPProject,
          id: projectId,
          lastUpdated: projectLastUpdatedFormPP,
          name: projectNameFormPP,
          slug: projectSlugFormPP,
        } = projectFromPP;

        const projectFromDatabase = projectsFromDB.find(
          project => project.id === projectId,
        );

        if (projectFromDatabase.lastUpdated !== projectLastUpdatedFormPP) {
          // Project exists and last updated has changed, update the entire project and sites
          updatePromises.push(
            prisma.project.update({
              where: {
                id: projectId,
              },
              data: {
                lastUpdated: projectLastUpdatedFormPP,
                name: projectNameFormPP,
                slug: projectSlugFormPP,
              },
            }),
          );

          const tpoId = projectFromPP.tpo.id;
          const siteIdsFromPP = sitesFromPPProject.map(
            site => site.properties.id,
          );

          for (const siteFromPP of sitesFromPPProject) {
            const {geometry, properties} = siteFromPP;
            const {id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP} =
              properties;

            if (geometry && geometry.type) {
              const siteFromDatabase = dbSites.find(
                site => site.id === siteIdFromPP,
              );

              const radius = 0;

              if (!siteFromDatabase) {
                // Site does not exist in the database, create a new site
                createPromises.push(
                  prisma.site.create({
                    data: {
                      id: siteIdFromPP,
                      type: geometry.type,
                      geometry: geometry,
                      radius: radius,
                      userId: tpoId,
                      projectId: projectId,
                      lastUpdated: siteLastUpdatedFromPP.date,
                    },
                  }),
                );
              } else if (
                siteFromDatabase.lastUpdated !== siteLastUpdatedFromPP.date
              ) {
                // Site exists in the database but last updated has changed, update the site
                updatePromises.push(
                  prisma.site.update({
                    where: {
                      id: siteIdFromPP,
                    },
                    data: {
                      type: geometry.type,
                      geometry: geometry,
                      radius: radius,
                      lastUpdated: siteLastUpdatedFromPP.date,
                    },
                  }),
                );
              }
            } else {
              // Handle the case where geometry or type is null
              console.log(
                `Skipping site with id ${siteIdFromPP} due to null geometry or type.`,
              );
            }
          }
        }
      }
      const createResults = await Promise.all(createPromises);
      const updateResults = await Promise.all(updatePromises);
      const deleteResults = await Promise.all(deletePromises);

      const createCount = createResults.length; // Number of created items
      const updateCount = updateResults.length; // Number of updated items
      const deleteCount = deleteResults.length; // Number of deleted items

      console.log('Create Count:', createCount);
      console.log('Update Count:', updateCount);
      console.log('Delete Count:', deleteCount);

      return {created: createCount, updated: updateCount, deleted: deleteCount};
    });
  }),

  permanentlyDeleteUsers: publicProcedure.mutation(async ({ctx}) => {
    await ctx.prisma.$transaction(async prisma => {
      const usersToDelete = await prisma.user.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: subtractDays(new Date(), 7),
          },
        },
        select: {
          id: true,
        },
      });

      const userIdsToDelete = usersToDelete.map(user => user.id);

      if (userIdsToDelete.length > 0) {
        await prisma.site.deleteMany({
          where: {
            userId: {
              in: userIdsToDelete,
            },
          },
        });

        await prisma.alertMethod.deleteMany({
          where: {
            userId: {
              in: userIdsToDelete,
            },
          },
        });

        await prisma.project.deleteMany({
          where: {
            userId: {
              in: userIdsToDelete,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIdsToDelete,
            },
          },
        });
      }
    });

    return {success: true};
  }),
});
