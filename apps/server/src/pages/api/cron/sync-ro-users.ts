// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/sync-ro-users
// Sync RO Users CRON job
// This cron job runs every day and syncs sites, projects, and profile data for RO users.

import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { fetchAllProjectsWithSites } from "../../../../src/utils/fetch";
import moment from 'moment';
import { Prisma, Project } from "@prisma/client";
import { type TreeProjectExtended } from '@planet-sdk/common'

export default async function syncROUsers(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }

    // Fetch projects from PP API
    const allProjectsPPWebApp: TreeProjectExtended[] = await fetchAllProjectsWithSites();

    // Fetch RO Users from the database and their respective remoteIds
    const ROUsers = await prisma.user.findMany({
        where: {
            isPlanetRO: true,
        },
        select: {
            remoteId: true,
            id: true,
        },
    });

    const userRemoteIdList = ROUsers.map(user => user.remoteId);

    // Create a map to associate remoteId with userId
    const mapRemoteIdWithUserId = new Map();
    ROUsers.forEach(user => {
        mapRemoteIdWithUserId.set(user.remoteId, user.id);
    });

    // Filter projects from PP API to include only those related to RO users
    const projectsPP = allProjectsPPWebApp.filter(projectPP =>
        userRemoteIdList.includes(projectPP.tpo.id)
    );

    // Fetch corresponding projects for the RO users from the database
    const userIdList = ROUsers.map(user => user.id);
    const projectsFA = await prisma.project.findMany({
        where: {
            userId: {
                in: userIdList
            }
        }
    });

    // Identify projects in the database that are not present in PP API
    const projectsIdsFA = projectsFA.map((project) => project.id);
    const deleteFAProjectIds = projectsIdsFA.filter(
        (projectId) => !projectsPP.some((project) => project.id === projectId)
    );

    // Dissociate sites associated with these projects and delete the projects
    if (deleteFAProjectIds.length) {
        await prisma.$transaction(async (prisma) => {
            await prisma.site.updateMany({
                where: {
                    projectId: {
                        in: deleteFAProjectIds,
                    },
                },
                data: {
                    projectId: null,
                },
            });
            logger(`Deleted projects with ids: ${deleteFAProjectIds.join(", ")}`, 'info',);
            await prisma.project.deleteMany({
                where: {
                    id: {
                        in: deleteFAProjectIds,
                    },
                },
            });
        });
    }

    // Identify new projects from PP API that are not present in the database
    const newProjectsPP = projectsPP.filter(
        (projectPP) => !projectsFA.some((projectFA) => projectFA.id === projectPP.id)
    );

    // Add those projects to the database, and all the sites inside of it.
    if (newProjectsPP.length > 0) {
        // Prepare the projects and sites data for bulk creation
        const newProjectData: Project[] = [];
        const newSiteData: Prisma.SiteCreateManyInput[] = [];

        for (const projectPP of newProjectsPP) {
            const { id: projectId, name: projectName, slug: projectSlug, lastUpdated: projectLastUpdated, sites: sitesFromPP } = projectPP;
            const tpoId = projectPP.tpo.id;
            const userId = mapRemoteIdWithUserId.get(tpoId);

            // Add the new project to the array for bulk creation
            newProjectData.push({
                id: projectId,
                name: projectName,
                slug: projectSlug,
                lastUpdated: new Date(),
                userId: userId,
            });

            // If sitesFromPP is not undefined, and its length is greater than 0, 
            // Iterate through the sites of the new project
            if (sitesFromPP && sitesFromPP.length > 0) {
                for (const siteFromPP of sitesFromPP) {
                    const { geometry, properties } = siteFromPP;
                    const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP } = properties;

                    if (geometry && geometry.type) {
                        // Add the new site to the array for bulk creation
                        newSiteData.push({
                            id: siteIdFromPP,
                            type: geometry.type,
                            geometry: geometry,
                            radius: 0,
                            projectId: projectId,
                            lastUpdated: new Date(),
                            userId: userId,
                        });
                    } else {
                        // Handle the case where geometry or type is null
                        logger(`Skipping site with id ${siteIdFromPP} due to null geometry or type.`, 'info',);
                    }
                }
            }
        }

        // Add the new projects and sites to the database in a transaction
        await prisma.$transaction(async (prisma) => {
            const createdProjects = await prisma.project.createMany({
                data: newProjectData,
            });
            const createdSites = await prisma.site.createMany({
                data: newSiteData,
            });
        })
    }


    // Fetch all sites from the database for the projects in projectsPP
    const sitesFA = await prisma.site.findMany({
        where: {
            projectId: {
                in: projectsPP.map((project) => project.id),
            },
        },
    });

    const newProjectsFA = await prisma.project.findMany({
        where: {
            userId: {
                in: userIdList
            }
        }
    });

    // Create a list of site IDs from PP
    const ppSiteIdList: string[] = [];
    for (const projectPP of projectsPP) {
        if (projectPP.sites && projectPP.sites.length > 0) {  // Checking if sites is not null before accessing it
            for (const siteFromPP of projectPP.sites) {
                ppSiteIdList.push(siteFromPP.properties.id);
            }
        }
    }

    // Perform bulk creations, bulk updates, and bulk deletions for sites
    await prisma.$transaction(async (prisma) => {
        const createPromises = [];
        const updatePromises = [];
        const deletePromises = [];

        // Identify sites in the database that are not present in PP API and soft delete them
        for (const siteFA of sitesFA) {
            if (!ppSiteIdList.includes(siteFA.id)) {
                deletePromises.push(
                    prisma.site.update({
                        where: {
                            id: siteFA.id,
                        },
                        data: {
                            projectId: null,
                            deletedAt: new Date(),
                        },
                    })
                );
            }
        }
        logger(`Deleting ${deletePromises.length} sites not present in the PP API`, 'info',);

        // For each project in PP API, identify sites in the database that need to be updated or created
        for (const projectPP of projectsPP) {
            const {
                sites: sitesFromPPProject,
                id: projectId,
                lastUpdated: projectLastUpdated,
                name: projectNameFormPP,
                slug: projectSlugFormPP,
            } = projectPP;
            const projectLastUpdatedFormPP = moment(projectLastUpdated, 'YYYY-MM-DD HH:mm:ss').toDate(); // Convert to Date object
            const projectFromDatabase = newProjectsFA.find((project) => project.id === projectId);

            // If the project has been updated in the PP API, update the project and its sites in the database
            if (projectFromDatabase!.lastUpdated?.getTime() !== projectLastUpdatedFormPP.getTime()) {
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
                    })
                );

                const tpoId = projectPP.tpo.id;
                const userId = mapRemoteIdWithUserId.get(tpoId);

                if (sitesFromPPProject && sitesFromPPProject.length > 0) {
                    for (const siteFromPP of sitesFromPPProject) {
                        const { geometry, properties } = siteFromPP;
                        const { id: siteIdFromPP, lastUpdated: siteLastUpdated } = properties;
                        const siteLastUpdatedFromPP = moment(siteLastUpdated.date, siteLastUpdated.timezone).utc().toDate();

                        if (geometry && geometry.type) {
                            const siteFromDatabase = sitesFA.find((site) => site.id === siteIdFromPP);

                            const radius = 0;

                            // If the site does not exist in the database, create a new site
                            if (!siteFromDatabase) {
                                createPromises.push(
                                    prisma.site.create({
                                        data: {
                                            id: siteIdFromPP,
                                            type: geometry.type,
                                            geometry: geometry,
                                            radius: radius,
                                            userId: userId,
                                            projectId: projectId,
                                            lastUpdated: new Date(),
                                        },
                                    })
                                );
                                // If the site exists in the database but has been updated in the PP API, update the site in the database
                            } else if (siteFromDatabase.lastUpdated?.getTime() !== siteLastUpdatedFromPP.getTime()) {
                                updatePromises.push(
                                    prisma.site.update({
                                        where: {
                                            id: siteIdFromPP,
                                        },
                                        data: {
                                            type: geometry.type,
                                            geometry: geometry,
                                            radius: radius,
                                            lastUpdated: siteLastUpdatedFromPP,
                                        },
                                    })
                                );
                            }
                        } else {
                            // Handle the case where geometry or type is null
                            logger(`Skipping site with id ${siteIdFromPP} due to null geometry or type.`, 'info',);
                        }
                    }
                }
            }
        }

        // Execute all promises
        const createResults = await Promise.all(createPromises);
        const updateResults = await Promise.all(updatePromises);
        const deleteResults = await Promise.all(deletePromises);

        const createCount = createResults.length; // Number of created items
        const updateCount = updateResults.length; // Number of updated items
        const deleteCount = deleteResults.length; // Number of deleted items

        logger(`Created ${createCount} items. Updated ${updateCount} items. Deleted ${deleteCount} items.`, 'info',);

        res.status(200).json({
            message: "Success! Data has been synced for RO Users!",
            status: 200,
            results: { created: createCount, updated: updateCount, deleted: deleteCount },
        });
    }).catch(error => {
        logger(`Error in transaction: ${error}`, "error");
        res.status(500).json({
            message: "An error occurred while syncing data for RO Users.",
            status: 500
        });
    });
}
