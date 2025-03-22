// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/sync-ro-users
// Sync RO Users CRON job
// This cron job runs every day and syncs sites, projects, and profile data for RO users.


import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../server/logger";
import { fetchAllProjectsWithSites } from "../../../utils/fetch";
import moment from 'moment';
import type { Prisma, Project, User } from "@prisma/client";
import { type TreeProjectExtended } from '@planet-sdk/common'

// https://vercel.com/docs/functions/configuring-functions
export const config = {
  maxDuration: 300,
  memory: 1769
};

const thumbnailPrefix = 'https://cdn.plant-for-the-planet.org/media/cache/profile/thumb/';

export default async function syncROUsers(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }

    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;

    const createCounts = {
        users: 0,
        projects: 0,
        sites: 0
    }
    const updateCounts = {   
        users: 0, 
        projects: 0,
        sites: 0,
    }
    const deleteCounts = {
        users: 0,
        projects: 0,
        sites: 0,
    }

    try {
        // Fetch projects from PP API
        let allProjectsPPWebApp: TreeProjectExtended[] = await fetchAllProjectsWithSites();
        allProjectsPPWebApp = allProjectsPPWebApp.filter(el => el.allowDonations)

        // Extract unique RO users from projects with allowDonations true.
        const uniqueUsers = new Map<string, Partial<User>>();
        allProjectsPPWebApp.forEach((project) => {
            if (project.tpo) {
                if (!uniqueUsers.has(project.tpo.id)) {
                    uniqueUsers.set(project.tpo.id, {
                    remoteId: project.tpo.id,
                    name: project.tpo.name,
                    email: project.tpo.email,
                    isPlanetRO: true,
                    image: project.tpo.image ? `${thumbnailPrefix}${project.tpo.image}` : undefined,
                    isVerified: true,
                    detectionMethods: ["MODIS", "VIIRS", "LANDSAT"]
                    });
                }
            }
        });
        logger(`Extracted ${uniqueUsers.size} unique RO users from projects.`, "info");

        // Insert new users into the database if they don't already exist.
        const usersToCreate = Array.from(uniqueUsers.values());
        try {
            // Extract remoteIds from the usersToCreate list.
            const remoteIds = usersToCreate.map((user) => user.remoteId);

            // Query the DB for users with these remoteIds.
            const existingUsers = await prisma.user.findMany({
                where: { remoteId: { in: remoteIds } },
                select: { remoteId: true },
            });

            // Create a Set of the existing remoteIds.
            const existingRemoteIds = new Set(existingUsers.map((user) => user.remoteId));

            // Filter out users that already exist based on remoteId.
            const newUsersToCreate = usersToCreate.filter(
                (user) => !existingRemoteIds.has(user.remoteId)
            );

            if (newUsersToCreate.length > 0) {
                // User creation in transaction (already using transaction)
                const result = await prisma.$transaction(
                    newUsersToCreate.map(userData => 
                        prisma.user.create({
                            data: {
                                ...userData,
                                alertMethods: {
                                    create: {
                                        method: "email",
                                        destination: userData.email,
                                        isVerified: true,
                                        isEnabled: false,
                                    }
                                }
                            }
                        })
                    )
                );

                createCount += result.length;
                createCounts.users += result.length;
                logger(`Created ${result.length} new users.`, "info");
            } else {
                logger("No new users to create.", "info");
            }
        } catch (error) {
            logger(`Error creating users: ${error}`, "error");
            res.status(500).json({ 
                message: "Error creating users", 
                status: 500 
            });
            return;
        }

        // Fetch RO Users from the Firealert database and select their ids and remoteIds
        const ROUsers = await prisma.user.findMany({
            where: {
                isPlanetRO: true,
            },
            select: {
                remoteId: true,
                id: true,
            },
        });

        // Create a map to associate remoteId with userId
        const map_userRemoteId_to_userId = new Map();
        ROUsers.forEach(user => {
            map_userRemoteId_to_userId.set(user.remoteId, user.id);
        });

        // Filter projects from PP API to include only those related to RO users
        const userRemoteIdList = ROUsers.map(user => user.remoteId);
        const projectsPP1 = allProjectsPPWebApp.filter(projectPP =>
            userRemoteIdList.includes(projectPP.tpo.id)
        );

        // Fetch all projects for the RO users from the Firealert database
        const userIdList = ROUsers.map(user => user.id);
        const projectsFA = await prisma.project.findMany({
            where: {
                userId: {
                    in: userIdList
                }
            }
        });

        // Filter projects from the pp web api, depending on the project.id
        const projectsIdsFA = projectsFA.map((project) => project.id);
        const projectsPP2 = allProjectsPPWebApp.filter(projectPP =>
            projectsIdsFA.includes(projectPP.id)
        );

        // Combine projectsPP1 and projectsPP2 without duplicates
        const projectsPP = projectsPP1.concat(projectsPP2.filter((projectPP2) =>
            !projectsPP1.some((projectPP1) => projectPP1.id === projectPP2.id)
        ));
        // Identify projects that are in PP Webapp that are not present in the FA database
        const projectsInPP_not_in_FA = projectsPP.filter(
            (projectPP) => !projectsFA.some((projectFA) => projectFA.id === projectPP.id)
        );

        const sitesThatAreOrWereOnceRemote = await prisma.site.findMany({
            where: {
                origin: 'ttc',
                userId: {
                    in: userIdList,
                },
            },
        });

        const ids_sitesThatAreOrWereOnceRemote = sitesThatAreOrWereOnceRemote.map(site => site.id)
        const map_ids_sitesThatAreOrWereOnceRemote_to_remoteId = new Map();
        sitesThatAreOrWereOnceRemote.forEach(site => {
            map_ids_sitesThatAreOrWereOnceRemote_to_remoteId.set(site.remoteId, site.id);
        });

        // Add those projects to the database, and all the sites inside of it.
        if (projectsInPP_not_in_FA.length > 0) {
            // Prepare the projects and sites data for bulk creation
            const newProjectData: Project[] = [];
            const newSiteData: Prisma.SiteCreateManyInput[] = [];
            // Prepare an array of promises for site updates
            const updateSitePromises = [];

            for (const projectPP of projectsInPP_not_in_FA) {
                const { id: projectId, name: projectName, slug: projectSlug, sites: sitesFromPP } = projectPP;
                const tpoId = projectPP.tpo.id;
                const userId = map_userRemoteId_to_userId.get(tpoId);

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
                        const { id: remoteId_PP, name:siteName } = properties;
                        const siteId_mapped_from_remoteId = map_ids_sitesThatAreOrWereOnceRemote_to_remoteId.get(remoteId_PP)

                        // Check if geometry and geometry.type exists
                        if (geometry && geometry.type) {
                            // If site already existed before and was soft deleted from webapp, link that site with its corresponding project
                            if (ids_sitesThatAreOrWereOnceRemote.includes(siteId_mapped_from_remoteId)) {
                                // Prepare the site for bulk update, during update make the projectId null, and deletedAt as null.
                                updateSitePromises.push(
                                    prisma.site.update({
                                        where: {
                                            id: siteId_mapped_from_remoteId
                                        },
                                        data: {
                                            projectId: projectId,
                                            deletedAt: null
                                        }
                                    })
                                );
                            } else {
                                // Add the new site to the array for bulk creation
                                newSiteData.push({
                                    remoteId: remoteId_PP,
                                    name: siteName,
                                    origin: 'ttc',
                                    type: geometry.type,
                                    geometry: geometry,
                                    radius: 0,
                                    projectId: projectId,
                                    lastUpdated: new Date(),
                                    userId: userId,
                                });
                            }
                        } else {
                            // Handle the case where geometry or type is null
                            logger(`Skipping site with id ${remoteId_PP} due to null geometry or type.`, 'info',);
                        }
                    }
                }
            }

            // Use transaction for new projects and sites creation
            await prisma.$transaction(async (prismaClient) => {
                // Add the new projects
                const createdProjects = await prismaClient.project.createMany({
                    data: newProjectData,
                });
                
                // Add the new sites
                const createdSites = await prismaClient.site.createMany({
                    data: newSiteData,
                });
                
                // Execute all site update promises in transaction
                const updateResults = await Promise.all(
                    updateSitePromises.map(updatePromise => 
                        // Replace prisma with prismaClient
                        prismaClient.site.update(updatePromise._getPayload())
                    )
                );
                
                createCount = createCount + createdProjects.count + createdSites.count;
                updateCount = updateCount + updateResults.length;

                createCounts.projects += createdProjects.count;
                createCounts.sites += createdSites.count;
                updateCounts.sites += updateResults.length;
            });
        }

        // Fetch all sites from the database for the projects in projectsPP
        // Only sites of public projects should be fetched.
        const sitesFA = await prisma.site.findMany({
            where: {
                origin: 'ttc',
                projectId: {
                    in: projectsPP.map((project) => project.id),
                },
            },
        });

        const mapSiteRemoteId_to_SiteId = new Map();
        sitesFA.forEach(site => {
            mapSiteRemoteId_to_SiteId.set(site.remoteId, site.id);
        });

        // Refetch projects from database to also include projects that were just created
        // Only public projects should be fetched.
        const newProjectsFA = await prisma.project.findMany({
            where: {
                id: {
                    in: projectsPP.map((project) => project.id),
                }
            }
        });

        const remoteIdsList_SiteFA = sitesFA.map(siteFA => siteFA.remoteId) as string[];

        // Create a list of site IDs from PP
        const remoteIdsList_PP: string[] = [];
        for (const projectPP of projectsPP) {
            if (projectPP.sites && projectPP.sites.length > 0) {  // Checking if sites is not null before accessing it
                for (const siteFromPP of projectPP.sites) {
                    remoteIdsList_PP.push(siteFromPP.properties.id);
                }
            }
        }

        // Find the remoteIds, which is present in remoteIdsList_PP but not in remoteIdsList_SiteFA
        const remoteIdsInFA_NotInPP = remoteIdsList_SiteFA.filter(remoteId => !remoteIdsList_PP.includes(remoteId));

        const siteIdsInFA_NotInPP = sitesFA.filter(site => remoteIdsInFA_NotInPP.includes(site.remoteId as string)).map(site => site.id);

        // Prepare operations in transaction
        await prisma.$transaction(async (prismaClient) => {
            const createPromises = [];
            const updatePromises = [];
            let sitesDisassociated = 0;

            // Identify sites in the database that are not present in PP API and dissociate those sites from the projects
            if (siteIdsInFA_NotInPP.length > 0) {
                const deleteResult = await prismaClient.site.updateMany({
                    where: {
                        id: {
                            in: siteIdsInFA_NotInPP,
                        },
                    },
                    data: {
                        projectId: null,
                    },
                });
                sitesDisassociated = deleteResult.count;
                logger(`Soft Deleting or disassociating ${sitesDisassociated} sites not present in the Webapp`, 'info');
            }

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
                        prismaClient.project.update({
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
                }

                const tpoId = projectPP.tpo.id;
                const userId = map_userRemoteId_to_userId.get(tpoId);

                // If the project has sites
                if (sitesFromPPProject && sitesFromPPProject.length > 0) {
                    for (const siteFromPP of sitesFromPPProject) {
                        const { geometry, properties } = siteFromPP;
                        const { id: remoteId_fromPP, lastUpdated: siteLastUpdated, name: siteName } = properties;
                        const siteLastUpdatedFromPP = moment(siteLastUpdated.date.split('.')[0], 'YYYY-MM-DD HH:mm:ss').utc().toDate();

                        // Check if the site is valid
                        if (geometry && geometry.type) {
                            const siteId_in_FADatabase = map_ids_sitesThatAreOrWereOnceRemote_to_remoteId.get(remoteId_fromPP)
                            const radius = 0;
                            let siteFromDatabase;
                            // Check if the site is already in database
                            if (siteId_in_FADatabase) {
                                siteFromDatabase = sitesFA.find((site) => site.id === siteId_in_FADatabase);
                            }
                            // If the site does not exist in the database, create a new site
                            if (!siteFromDatabase) {
                                createPromises.push(
                                    prismaClient.site.create({
                                        data: {
                                            remoteId: remoteId_fromPP,
                                            name: siteName,
                                            origin: 'ttc',
                                            type: geometry.type,
                                            geometry: geometry,
                                            radius: radius,
                                            userId: userId,
                                            projectId: projectId,
                                            lastUpdated: new Date(),
                                        },
                                    })
                                );
                            // else if the site exists in the FA database, and has been updated in the webapp, update the site in the database
                            } else if (siteFromDatabase.lastUpdated?.getTime() !== siteLastUpdatedFromPP.getTime()) {
                                updatePromises.push(
                                    prismaClient.site.update({
                                        where: {
                                            id: siteFromDatabase.id,
                                        },
                                        data: {
                                            name: siteName,
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
                            logger(`Skipping site with id ${remoteId_fromPP} due to null geometry or type.`, 'info');
                        }
                    }
                }
            }

            // Execute all promises
            const createResults = await Promise.all(createPromises);
            const updateResults = await Promise.all(updatePromises);

            createCount += createResults.length; // Number of created items
            updateCount += updateResults.length; // Number of updated items
            deleteCount += sitesDisassociated; // Number of deleted items

            createCounts.sites += createResults.length;
            const _updatedProjects = updateResults.filter(el => el?.slug);
            updateCounts.projects += _updatedProjects.length;
            updateCounts.sites += updateResults.length - _updatedProjects.length;
            deleteCounts.sites += sitesDisassociated;
        });

        logger(`Created ${createCount} items. Updated ${updateCount} items. Deleted ${deleteCount} items.`, 'info');

        logger(`Created ${createCounts.users} users. Updated ${updateCounts.users} users. Deleted ${deleteCounts.users} users.`, 'info');
        logger(`Created ${createCounts.projects} projects. Updated ${updateCounts.projects} projects.`, 'info');
        logger(`Created ${createCounts.sites} sites. Updated ${updateCounts.sites} sites. Deleted ${deleteCounts.sites} sites.`, 'info');

        res.status(200).json({
            message: "Success! Data has been synced for RO Users!",
            status: 200,
            results: { 
                created: createCount, updated: updateCount, deleted: deleteCount, 
                createCounts, updateCounts, deleteCounts
            },
        });
    } catch (error) {
        console.log(error);
        logger(`Error in transaction: ${error}`, "error");
        res.status(500).json({
            message: "An error occurred while syncing data for RO Users.",
            status: 500
        });
    }
}