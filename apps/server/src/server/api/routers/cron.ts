import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { fetchAllProjectsWithSites } from "../../../utils/fetch"
import { parse } from 'csv-parse'
import * as turf from '@turf/turf';
import { subtractDays } from "../../../utils/date"
import { makeDetectionCoordinates } from "../../../utils/turf";
import { type InnerTRPCContext } from '../trpc'


interface TRPCContext extends InnerTRPCContext { }

const sources: Source[] = ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP', 'LANDSAT_NRT']
type Source = 'MODIS_NRT' | 'MODIS_SP' | 'VIIRS_NOAA20_NRT' | 'VIIRS_SNPP_NRT' | 'VIIRS_SNPP_SP' | 'LANDSAT_NRT'

interface MODISAndVIIRS {
    latitude: string;
    longitude: string;
    bright_ti4: string;
    scan: string;
    track: string;
    acq_date: string;
    acq_time: string;
    satellite: string;
    instrument: string;
    confidence: string;
    version: string;
    bright_ti5: string;
    frp: string;
    daynight: string;
}
interface GEOSTAT {
    latitude: string;
    longitude: string;
    brightness: string;
    pixel_Y: string;
    pixel_X: string;
    acquire_Time: string;
    confidence: string;
    version: string;
    brightness2: string;
    frp: string;
    daynight: string;
    satellite: string;
}
interface LANDSAT {
    latitude: string;
    longitude: string;
    path: string;
    row: string;
    scan: string;
    track: string;
    acq_date: string;
    acq_time: string;
    satellite: string;
    confidence: string;
    daynight: string;
}
type DetectedBy = 'MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY'
type ConfidenceLevel = 'high' | 'medium' | 'low'

interface FireAlert extends MODISAndVIIRS, LANDSAT, GEOSTAT { }


type TurfMultiPolygonOrPolygon = turf.helpers.Feature<turf.helpers.MultiPolygon, turf.helpers.Properties> | turf.helpers.Feature<turf.helpers.Polygon, turf.helpers.Properties>
type TurfCoordinates = turf.helpers.Feature<turf.helpers.Point, turf.helpers.Properties> | turf.helpers.Feature<turf.helpers.MultiPolygon, turf.helpers.Properties> | turf.helpers.Feature<turf.helpers.Polygon, turf.helpers.Properties>

// Helper function to fetch and parse CSV data
async function fetchAndParseCSV(url: string): Promise<FireAlert[]> {
    const response = await fetch(url);
    const csv = await response.text();
    return new Promise<FireAlert[]>((resolve, reject) => {
        const parser = parse(csv, { columns: true });
        const records: FireAlert[] = [];
        parser.on("readable", function () {
            let record;
            while ((record = parser.read())) {
                records.push(record);
            }
        });
        parser.on("error", function (error) {
            reject(new Error("Error parsing CSV file: " + error.message));
        });
        parser.on("end", function () {
            resolve(records);
        });
    });
}

// Helper function to process and transform records
function processRecords(records: FireAlert[], detectedBy: DetectedBy) {
    return records.map((record) => {
        const longitude = parseFloat(record.longitude);
        const latitude = parseFloat(record.latitude);
        const date = new Date(record.acq_date) ?? new Date();
        const frp = parseFloat(record.frp) ?? null;
        let confidenceLevel: ConfidenceLevel;

        // Assign confidence level based on record.instrument and record.confidence
        if (detectedBy === "MODIS") {
            switch (record.confidence) {
                case "h":
                    confidenceLevel = "high";
                    break;
                case "m":
                    confidenceLevel = "medium";
                    break;
                case "l":
                    confidenceLevel = "low";
                    break;
            }
        } else if (detectedBy === "VIIRS") {
            switch (record.confidence) {
                case "h":
                    confidenceLevel = "high";
                    break;
                case "n":
                    confidenceLevel = "medium";
                    break;
                case "l":
                    confidenceLevel = "low";
                    break;
            }
        } else if (detectedBy === "LANDSAT") {
            switch (record.confidence) {
                case "H":
                    confidenceLevel = "high";
                    break;
                case "M":
                    confidenceLevel = "medium";
                    break;
                case "L":
                    confidenceLevel = "low";
                    break;
            }
        } else if (detectedBy === "GEOSTATIONARY") {
            switch (record.confidence) {
                case "10":
                case "30":
                case "11":
                case "31":
                case "13":
                case '33':
                case '14':
                case '34':
                    confidenceLevel = "high";
                    break;
                case "12":
                    confidenceLevel = "medium";
                    break;
                case "15":
                case "35":
                    confidenceLevel = "low";
                    break;
            }
        }

        return {
            latitude: latitude,
            longitude: longitude,
            date: date,
            confidence: confidenceLevel,
            detectedBy: detectedBy,
            frp: frp,
            source: 'FIRMS'
        };
    });
}

// Function to run for each source
async function processSource(ctx: TRPCContext, source: string, currentDate: string): Promise<void> {
    let detectedBy: DetectedBy;

    if (source === "MODIS_NRT" || source === "MODIS_SP") {
        detectedBy = "MODIS";
    } else if (
        source === "VIIRS_SNPP_NRT" ||
        source === "VIIRS_SNPP_SP" ||
        source === "VIIRS_NOAA20_NRT"
    ) {
        detectedBy = "VIIRS";
    } else if (source === "LANDSAT_NRT") {
        detectedBy = "LANDSAT";
    }
    try {
        const mapKey = await ctx.prisma.geoEventProvider.findFirst({
            where: {
                slug: source,
                type: "fire",
            },
        });
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`;
        const records = await fetchAndParseCSV(url);
        if (records.length === 0) {
            console.log(`No alerts found for source: ${source}`);
            return;
        }
        const alerts = processRecords(records, detectedBy);
        await ctx.prisma.geoEvent.createMany({
            data: alerts,
        });
        console.log(`Successfully populated alerts for source: ${source}`);
    } catch (error) {
        console.error(`Error processing source: ${source}`);
        console.error(error);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error processing source",
        });
    }
}


// TODO: test all three procedures
export const cronRouter = createTRPCRouter({

    // TODO: debug the variables when fetched from pp
    syncProjectsAndSitesForAllROUsers: publicProcedure
        .mutation(async ({ ctx }) => {
            // Get all the projects from PP
            const projectsFromPP = await fetchAllProjectsWithSites();
            // Get all projects from DB, and only ROs have projects, normal user cannot make projects
            const projectsFromDB = await ctx.prisma.project.findMany();
            // Filter PP list to only contain projects that are in DB
            const ppListFiltered = projectsFromPP.filter((projectFromPP) =>
                projectsFromDB.some((projectFromDB) => projectFromDB.id === projectFromPP.id)
            );

            // Check for projects in DB that are not in PP and delete them
            const dbProjectsIds = projectsFromDB.map((project) => project.id);
            const projectsIdsToDelete = dbProjectsIds.filter(
                (projectId) => !ppListFiltered.some((project) => project.id === projectId)
            );

            if (projectsIdsToDelete.length) {
                await ctx.prisma.$transaction(async (prisma) => {
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
                        in: ppListFiltered.map((project) => project.id),
                    },
                },
            });

            // Create a mapping of site IDs to site lastUpdated values from PP
            const ppSiteLastUpdatedMap = new Map();
            for (const projectFromPP of ppListFiltered) {
                for (const siteFromPP of projectFromPP.sites) {
                    ppSiteLastUpdatedMap.set(siteFromPP.properties.id, siteFromPP.properties.lastUpdated.date);
                }
            }

            // Perform bulk creations, bulk updates, and bulk deletions for sites
            await ctx.prisma.$transaction(async (prisma) => {
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
                            })
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

                    const projectFromDatabase = projectsFromDB.find((project) => project.id === projectId);

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
                            })
                        );

                        const tpoId = projectFromPP.tpo.id;
                        const siteIdsFromPP = sitesFromPPProject.map((site) => site.properties.id);

                        for (const siteFromPP of sitesFromPPProject) {
                            const { geometry, properties } = siteFromPP;
                            const { id: siteIdFromPP, lastUpdated: siteLastUpdatedFromPP } = properties;

                            if (geometry && geometry.type) {
                                const siteFromDatabase = dbSites.find((site) => site.id === siteIdFromPP);

                                const radius = 0;
                                const detectionCoordinates = makeDetectionCoordinates(geometry, radius);

                                if (!siteFromDatabase) {
                                    // Site does not exist in the database, create a new site
                                    createPromises.push(
                                        prisma.site.create({
                                            data: {
                                                id: siteIdFromPP,
                                                type: geometry.type,
                                                geometry: geometry,
                                                radius: radius,
                                                detectionCoordinates: detectionCoordinates,
                                                userId: tpoId,
                                                projectId: projectId,
                                                lastUpdated: siteLastUpdatedFromPP.date,
                                            },
                                        })
                                    );
                                } else if (siteFromDatabase.lastUpdated !== siteLastUpdatedFromPP.date) {
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
                                                detectionCoordinates: detectionCoordinates,
                                                lastUpdated: siteLastUpdatedFromPP.date,
                                            },
                                        })
                                    );
                                }
                            } else {
                                // Handle the case where geometry or type is null
                                console.log(`Skipping site with id ${siteIdFromPP} due to null geometry or type.`);
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
                
                return { created: createCount, updated: updateCount, deleted: deleteCount };
            });
        }),



    permanentlyDeleteUsers: publicProcedure
        .mutation(async ({ ctx }) => {
            await ctx.prisma.$transaction(async (prisma) => {
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

                const userIdsToDelete = usersToDelete.map((user) => user.id);

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

            return { success: true };
        }),


    populategeoEventDatabase: publicProcedure.query(async ({ ctx }) => {
        const currentDate: string = new Date().toISOString().split("T")[0];
        try {
            await Promise.all(sources.map((source) => processSource(ctx, source, currentDate)));
            return {
                status: "success",
                message: "Successfully populated world fire alerts",
            };
        } catch (error) {
            console.error("Error populating world fire alerts");
            console.error(error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Error populating world fire alerts",
            });
        }
    }),

    bulkDeleteGeoEvent: publicProcedure
        .query(async ({ ctx }) => {
            const currentDate: string = new Date().toISOString().split("T")[0];
            const deletedAlerts = await ctx.prisma.geoEvent.deleteMany({
                where: {
                    date: {
                        not: {
                            equals: new Date(currentDate),
                        },
                    },
                },
            });
            return {
                status: "success",
                message: `${deletedAlerts.count} world alerts deleted`,
            };
        }),

    populateAlerts: publicProcedure.query(async ({ ctx }) => {
        try {
            const allUncheckedfireAlerts = await ctx.prisma.geoEvent.findMany({
                where: {
                    isProcessed: false,
                },
            });

            const sites = await ctx.prisma.site.findMany();
            if (!sites || sites.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "There are no sites",
                });
            }

            for (const uncheckedFireAlert of allUncheckedfireAlerts) {
                await ctx.prisma.$transaction(async (prisma) => {

                    const longitude = uncheckedFireAlert.longitude;
                    const latitude = uncheckedFireAlert.latitude;
                    const point = [longitude, latitude];
                    const turfPoint = turf.point(point);
                    const createdAlerts = [];

                    for (const site of sites) {
                        const siteBufferedCoordinates = site.detectionCoordinates;
                        let turfBufferedPolygon: TurfMultiPolygonOrPolygon;
                        if (site.type === "MultiPolygon") {
                            turfBufferedPolygon = turf.multiPolygon(siteBufferedCoordinates);
                        } else {
                            turfBufferedPolygon = turf.polygon(siteBufferedCoordinates);
                        }
                        const isAlertInsideBufferedSite = turf.booleanPointInPolygon(
                            turfPoint,
                            turfBufferedPolygon
                        );

                        let turfCoordinates: TurfCoordinates;
                        let isAlertInsideActualSite: Boolean = false
                        const coordinates = site.geometry.coordinates

                        if (site.type === 'Point') {
                            turfCoordinates = turf.point(coordinates)
                            isAlertInsideActualSite = false
                        } else if (site.type === 'Polygon') {
                            turfCoordinates = turf.polygon(coordinates)
                        } else {
                            turfCoordinates = turf.multiPolygon(coordinates)
                        }

                        if (site.type === 'Polygon' || site.type === 'MultiPolygon') {
                            isAlertInsideActualSite = turf.booleanPointInPolygon(
                                turfPoint,
                                turfCoordinates
                            )
                        }

                        let outsideBy: Number | null = null;
                        if (!isAlertInsideActualSite) {
                            const distance = turf.distance(turfPoint, turfCoordinates, {
                                units: "meters"
                            })
                            outsideBy = distance
                        }
                        if (isAlertInsideBufferedSite) {
                            createdAlerts.push({
                                type: "fire",
                                eventDate: uncheckedFireAlert.eventDate,
                                detectedBy: uncheckedFireAlert.detectedBy,
                                confidence: uncheckedFireAlert.confidence,
                                latitude: latitude,
                                longitude: longitude,
                                frp: uncheckedFireAlert.frp,
                                outside: outsideBy,
                                siteId: site.id,
                            });
                        }
                    }

                    if (createdAlerts.length > 0) {
                        await prisma.alert.createMany({
                            data: createdAlerts,
                        });
                    }

                    await prisma.geoEvent.update({
                        where: {
                            id: uncheckedFireAlert.id,
                        },
                        data: {
                            isProcessed: true,
                        },
                    });
                });
            }
            return {
                status: "success",
                message: "Alerts created and world fire alerts updated",
            };
        } catch (error) {
            // Handle and log the error appropriately
            console.error("Error occurred in populateAlerts:", error);
            // Return an error response
            return {
                status: "error",
                message: "An error occurred while processing the fire alerts",
            };
        }
    }),
    //`TODO: Send an alert notification to the user regarding the fire alert
    // TODO: Setup a while block to repeat the code above while length of allUncheckedfireAlerts is truthy. (Should do or not?)

})