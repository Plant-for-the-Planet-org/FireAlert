import { TRPCError } from "@trpc/server";
import { queryAlertSchema } from '../zodSchemas/alert.schema'
import { params as siteParams } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure
} from "../trpc";
import { parse } from 'csv-parse'
import * as turf from '@turf/turf';
import { Alert } from "@prisma/client";
import { type InnerTRPCContext, PPJwtPayload } from '../../api/trpc'
import { getUserIdByToken } from "../../../utils/token";
import { subtractDays } from "../../../utils/date";

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
        const eventDate = new Date(record.acq_date) ?? new Date();
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
            eventDate: eventDate,
            confidence: confidenceLevel,
            detectedBy: detectedBy,
            frp: frp,
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
    const mapKey = await ctx.prisma.alertProvider.findFirst({
        where: {
            slug: source,
            type: "fire",
        },
    });
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`;
    try {
        const records = await fetchAndParseCSV(url);
        if (records.length === 0) {
            console.log(`No alerts found for source: ${source}`);
            return;
        }
        const alerts = processRecords(records, detectedBy);
        await ctx.prisma.worldFireAlert.createMany({
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

export const alertRouter = createTRPCRouter({

    populateWorldFireAlertDatabase: publicProcedure.query(async ({ ctx }) => {
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

    deleteWorldFireAlerts: publicProcedure
        .query(async ({ ctx }) => {
            const currentDate: string = new Date().toISOString().split("T")[0];
            const deletedAlerts = await ctx.prisma.worldFireAlert.deleteMany({
                where: {
                    eventDate: {
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
            const allUncheckedfireAlerts = await ctx.prisma.worldFireAlert.findMany({
                where: {
                    isChecked: false,
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
                            const distance = turf.distance(turfPoint, turfPolygon, {
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

                    await prisma.worldFireAlert.update({
                        where: {
                            id: uncheckedFireAlert.id,
                        },
                        data: {
                            isChecked: true,
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

    // TODO: Find out where the alert is, inside or outside the site coordinates (possibly make a new data field that says how far the alert is compared to the site polygon)
    //`TODO: Send an alert notification to the user regarding the fire alert
    // TODO: Setup a while block to repeat the code above while length of allUncheckedfireAlerts is truthy. (Should do or not?)

    getAlertsForSite: protectedProcedure
        .input(siteParams)
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
                if (!userId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User ID not found",
                    });
                }
                const thirtyDaysAgo = subtractDays(new Date(), 30);
                const alertsForSite = await ctx.prisma.alert.findMany({
                    where: {
                        siteId: input.siteId,
                        eventDate: {
                            gte: thirtyDaysAgo
                        },
                    }
                })
                return {
                    status: 'success',
                    data: alertsForSite,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    getAlertsForUser: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = ctx.token ? await getUserIdByToken(ctx) : ctx.session?.user?.id;
                if (!userId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User ID not found",
                    });
                }
                const alertsForUser: Alert[] = [];
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId,
                    },
                });

                // Fetch alerts for each site
                for (const site of sites) {
                    const thirtyDaysAgo = subtractDays(new Date(), 30);
                    const alertsForEachSite = await ctx.prisma.alert.findMany({
                        where: {
                            siteId: site.id,
                            eventDate: {
                                gte: thirtyDaysAgo
                            },
                        },
                    });
                    alertsForUser.push(...alertsForEachSite);
                }
                return {
                    status: 'success',
                    data: alertsForUser,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),


    getAlert: protectedProcedure
        .input(queryAlertSchema)
        .query(async ({ ctx, input }) => {
            try {
                const alert = await ctx.prisma.alert.findFirst({
                    where: { id: input.alertId }
                })
                return {
                    status: 'success',
                    data: alert,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    deleteAnAlert: protectedProcedure
        .input(queryAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const deletedAlert = await ctx.prisma.alert.delete({
                    where: { id: input.alertId }
                })
                return {
                    status: 'success',
                    data: deletedAlert
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
