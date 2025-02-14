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

    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;

    // Fetch projects from PP API
    let allProjectsPPWebApp: TreeProjectExtended[] = await fetchAllProjectsWithSites();
    allProjectsPPWebApp = allProjectsPPWebApp.filter(el => el.allowDonations)

    // Extract unique RO users from projects with allowDonations true.
    const uniqueUsers = new Map<string, { 
        remoteId: string; 
        name: string; 
        email: string; 
        isPlanetRO: boolean; 
    }>();
    allProjectsPPWebApp.forEach((project) => {
        if (project.tpo) {
            if (!uniqueUsers.has(project.tpo.id)) {
                uniqueUsers.set(project.tpo.id, {
                remoteId: project.tpo.id,
                name: "NEW_" + project.tpo.name,
                email: project.tpo.email,
                isPlanetRO: true,
                });
            }
        }
    });
    logger(`Extracted ${uniqueUsers.size} unique RO users from projects.`, "info");

    // Insert new users into the database if they don't already exist.
    const usersToCreate = Array.from(uniqueUsers.values());
    try {
        const result = await prisma.user.createMany({
        data: usersToCreate,
        skipDuplicates: true,
        });
        createCount += result.count;
        logger(`Created ${result.count} new users (or skipped duplicates).`, "info");
    } catch (error) {
        logger(`Error creating users: ${error}`, "error");
        res.status(500).json({ message: "Error creating users", status: 500 });
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
                name: "NEW_" + projectName,
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
                                name: "NEW_" + siteName,
                                origin: "ttc",
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

        // Add the new projects and sites to the database in a transaction
        const createdProjects = await prisma.project.createMany({
            data: newProjectData,
        });
        const createdSites = await prisma.site.createMany({
            data: newSiteData,
        });
        // Await all update promises
        const updateResults = await Promise.all(updateSitePromises);

        createCount = createCount + createdProjects.count + createdSites.count
        updateCount = updateCount + updateResults.length
    }


    // Fetch all sites from the database for the projects in projectsPP
    // Only sites of public projects should be fetched.
    const sitesFA = await prisma.site.findMany({
        where: {
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

    const remoteIdsList_SiteFA = sitesFA.map(siteFA => siteFA.remoteId) as string[]

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

    // Perform bulk creations, bulk updates, and bulk deletions for sites
    try {
        const createPromises = [];
        const updatePromises = [];
        const deletePromises = [];

        // Identify sites in the database that are not present in PP API and dissociate those sites from the projects
        // While dissociating also turn isMonitored to false
        if (siteIdsInFA_NotInPP.length > 0) {
            deletePromises.push(
                prisma.site.updateMany({
                    where: {
                        id: {
                            in: siteIdsInFA_NotInPP,
                        },
                    },
                    data: {
                        projectId: null,
                        isMonitored: false,
                    },
                }))
            logger(`Soft Deleting ${siteIdsInFA_NotInPP.length} sites not present in the Webapp`, 'info',);
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
                    prisma.project.update({
                        where: {
                            id: projectId,
                        },
                        data: {
                            lastUpdated: projectLastUpdatedFormPP,
                            name:  "UPDATE_" + projectNameFormPP,
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
                                prisma.site.create({
                                    data: {
                                        remoteId: remoteId_fromPP,
                                        name: "NEW_" + siteName,
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
                                prisma.site.update({
                                    where: {
                                        id: siteFromDatabase.id,
                                    },
                                    data: {
                                        name:  "UPDATE_" + siteName,
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
                        logger(`Skipping site with id ${remoteId_fromPP} due to null geometry or type.`, 'info',);
                    }
                }
            }
        }

        // Execute all promises
        const createResults = await Promise.all(createPromises);
        const updateResults = await Promise.all(updatePromises);
        const deleteResults = await Promise.all(deletePromises);

        createCount = createCount + createResults.length; // Number of created items
        updateCount = updateCount + updateResults.length; // Number of updated items
        deleteCount = deleteCount + deleteResults.length; // Number of deleted items

        logger(`Created ${createCount} items. Updated ${updateCount} items. Deleted ${deleteCount} items.`, 'info',);

        res.status(200).json({
            message: "Success! Data has been synced for RO Users!",
            status: 200,
            results: { created: createCount, updated: updateCount, deleted: deleteCount },
        });
    } catch (error) {
        logger(`Error in transaction: ${error}`, "error");
        res.status(500).json({
            message: "An error occurred while syncing data for RO Users.",
            status: 500
        });
    }
}