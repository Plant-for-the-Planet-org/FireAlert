// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/sync-ro-users
// Sync RO Users CRON job
// This cron job runs every day and syncs sites, projects, and profile data for RO users.


import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../server/db'
import { env } from "../../../env.mjs";
import { logger } from "../../../../src/server/logger";
import { fetchAllProjectsWithSites } from "../../../../src/utils/fetch";
import moment from 'moment';
import type { Prisma, Project, User } from "@prisma/client";
import { type TreeProjectExtended } from '@planet-sdk/common'

// https://vercel.com/docs/functions/configuring-functions
export const config = {
  maxDuration: 300,
  memory: 1769
};

const thumbnailPrefix = 'https://cdn.plant-for-the-planet.org/media/cache/profile/thumb/';
const BATCH_SIZE = 500;


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
                // This transaction is necessary because we need atomicity between user creation and alert method creation
                await prisma.$transaction(async (prismaClient) => {
                    // Create users in bulk
                    const userResult = await prismaClient.user.createMany({
                        data: newUsersToCreate,
                    });
                    
                    // Fetch the newly created users to get their IDs
                    const createdUsers = await prismaClient.user.findMany({
                        where: {
                            remoteId: {
                                in: newUsersToCreate.map(user => user.remoteId)
                            }
                        },
                        select: {
                            id: true,
                            email: true
                        }
                    });
                    
                    // Create alert methods for each user in bulk
                    if (createdUsers.length > 0) {
                        const alertMethodsData = createdUsers.map(user => ({
                            method: "email",
                            destination: user.email,
                            isVerified: true,
                            isEnabled: false,
                            userId: user.id
                        }));
                        
                        await prismaClient.alertMethod.createMany({
                            data: alertMethodsData
                        });
                    }
                    
                    createCount += userResult.count;
                    createCounts.users += userResult.count;
                    logger(`Created ${userResult.count} new users.`, "info");
                });
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
            // Prepare sites to update using updateMany (group by common fields)
            const sitesToUpdate = [];

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
                                // Add to sites to update list
                                sitesToUpdate.push({
                                    id: siteId_mapped_from_remoteId,
                                    projectId: projectId,
                                    deletedAt: null
                                });
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

            // Create projects in bulk - no transaction needed
            await prisma.project.createMany({
                data: newProjectData,
            });
            createCount += newProjectData.length;
            createCounts.projects += newProjectData.length;
            
            // Process sites in batches - no transaction needed
            for (let i = 0; i < newSiteData.length; i += BATCH_SIZE) {
                const siteBatch = newSiteData.slice(i, i + BATCH_SIZE);
                const createdSites = await prisma.site.createMany({
                    data: siteBatch,
                });
                createCount += createdSites.count;
                createCounts.sites += createdSites.count;
            }
            
            // Group update operations by identical update data to reduce the number of queries
            // Group sites by projectId
            const sitesByProjectId = {};
            sitesToUpdate.forEach(site => {
                const key = `${site.projectId}-${site.deletedAt === null ? 'null' : site.deletedAt}`;
                if (!sitesByProjectId[key]) {
                    sitesByProjectId[key] = {
                        ids: [],
                        projectId: site.projectId,
                        deletedAt: site.deletedAt
                    };
                }
                sitesByProjectId[key].ids.push(site.id);
            });
            
            // Execute updateMany for each group - no transaction needed
            let totalSitesUpdated = 0;
            for (const key in sitesByProjectId) {
                const group = sitesByProjectId[key];
                
                // Process each group in batches
                for (let i = 0; i < group.ids.length; i += BATCH_SIZE) {
                    const idsBatch = group.ids.slice(i, i + BATCH_SIZE);
                    const updateResult = await prisma.site.updateMany({
                        where: {
                            id: {
                                in: idsBatch
                            }
                        },
                        data: {
                            projectId: group.projectId,
                            deletedAt: group.deletedAt
                        }
                    });
                    totalSitesUpdated += updateResult.count;
                }
            }
            
            updateCount += totalSitesUpdated;
            updateCounts.sites += totalSitesUpdated;
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

        // Identify sites in the database that are not present in PP API and dissociate those sites from the projects
        if (siteIdsInFA_NotInPP.length > 0) {
            // Process site disassociation in batches - no transaction needed
            for (let i = 0; i < siteIdsInFA_NotInPP.length; i += BATCH_SIZE) {
                const idsBatch = siteIdsInFA_NotInPP.slice(i, i + BATCH_SIZE);
                const deleteResult = await prisma.site.updateMany({
                    where: {
                        id: {
                            in: idsBatch,
                        },
                    },
                    data: {
                        projectId: null,
                    },
                });
                deleteCount += deleteResult.count;
                deleteCounts.sites += deleteResult.count;
            }
            logger(`Soft Deleting or disassociating ${deleteCount} sites not present in the Webapp`, 'info');
        }

        // Prepare bulk operations for updates
        const sitesToCreate = [];
        const projectUpdates = {}; // Group by update data
        const siteUpdates = {}; // Group by update data
        
        // For each project in PP API, identify sites that need to be updated or created
        for (const projectPP of projectsPP) {
            const {
                sites: sitesFromPPProject,
                id: projectId,
                lastUpdated: projectLastUpdated,
                name: projectNameFormPP,
                slug: projectSlugFormPP,
            } = projectPP;
            
            const projectLastUpdatedFormPP = moment(projectLastUpdated, 'YYYY-MM-DD HH:mm:ss').toDate();
            const projectFromDatabase = newProjectsFA.find((project) => project.id === projectId);

            // If the project has been updated in the PP API, prepare for bulk update
            if (projectFromDatabase?.lastUpdated?.getTime() !== projectLastUpdatedFormPP.getTime()) {
                // Create update entry keyed by the combination of values to update
                const updateKey = `${projectLastUpdatedFormPP.getTime()}-${projectNameFormPP}-${projectSlugFormPP}`;
                
                if (!projectUpdates[updateKey]) {
                    projectUpdates[updateKey] = {
                        ids: [],
                        data: {
                            lastUpdated: projectLastUpdatedFormPP,
                            name: projectNameFormPP,
                            slug: projectSlugFormPP,
                        }
                    };
                }
                
                projectUpdates[updateKey].ids.push(projectId);
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
                            sitesToCreate.push({
                                remoteId: remoteId_fromPP,
                                name: siteName,
                                origin: 'ttc',
                                type: geometry.type,
                                geometry: geometry,
                                radius: radius,
                                userId: userId,
                                projectId: projectId,
                                lastUpdated: new Date(),
                            });
                        } 
                        // else if the site exists in the FA database, and has been updated in the webapp, update the site
                        else if (siteFromDatabase.lastUpdated?.getTime() !== siteLastUpdatedFromPP.getTime()) {
                            // Group sites by common update criteria
                            const updateKey = `${siteName}-${geometry.type}-${JSON.stringify(geometry)}-${radius}-${siteLastUpdatedFromPP.getTime()}`;
                            
                            if (!siteUpdates[updateKey]) {
                                siteUpdates[updateKey] = {
                                    ids: [],
                                    data: {
                                        name: siteName,
                                        type: geometry.type,
                                        geometry: geometry,
                                        radius: radius,
                                        lastUpdated: siteLastUpdatedFromPP,
                                    }
                                };
                            }
                            
                            siteUpdates[updateKey].ids.push(siteFromDatabase.id);
                        }
                    } else {
                        // Handle the case where geometry or type is null
                        logger(`Skipping site with id ${remoteId_fromPP} due to null geometry or type.`, 'info');
                    }
                }
            }
        }

        // Execute bulk operations - no transactions needed
        let projectsUpdatedCount = 0;
        
        // Create sites in bulk if any - no transaction needed
        if (sitesToCreate.length > 0) {
            // Create new sites in batches
            for (let i = 0; i < sitesToCreate.length; i += BATCH_SIZE) {
                const siteBatch = sitesToCreate.slice(i, i + BATCH_SIZE);
                const createdSites = await prisma.site.createMany({
                    data: siteBatch
                });
                createCount += createdSites.count;
                createCounts.sites += createdSites.count;
            }
        }
        
        // Execute bulk project updates - no transaction needed
        for (const key in projectUpdates) {
            const group = projectUpdates[key];
            const result = await prisma.project.updateMany({
                where: {
                    id: {
                        in: group.ids
                    }
                },
                data: group.data
            });
            projectsUpdatedCount += result.count;
        }
        
        // Execute bulk site updates - no transaction needed
        for (const key in siteUpdates) {
            const group = siteUpdates[key];
            for (let i = 0; i < group.ids.length; i += BATCH_SIZE) {
                const idsBatch = group.ids.slice(i, i + BATCH_SIZE);
                const result = await prisma.site.updateMany({
                    where: {
                        id: {
                            in: idsBatch
                        }
                    },
                    data: group.data
                });
                updateCount += result.count;
                updateCounts.sites += result.count;
            }
        }
        
        // Update counts
        updateCount += projectsUpdatedCount;
        updateCounts.projects += projectsUpdatedCount;

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