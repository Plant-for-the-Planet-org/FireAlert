import { TRPCError } from "@trpc/server";
import { queryAlertSchema} from '../zodSchemas/alert.schema'
import { params as siteParams } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure
} from "../trpc";
import { parse } from 'csv-parse'
import * as turf from '@turf/turf';
import { Alert } from "@prisma/client";
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

interface FireAlert extends MODISAndVIIRS, LANDSAT { }


type TurfMultiPolygonOrPolygon = turf.helpers.Feature<turf.helpers.MultiPolygon, turf.helpers.Properties> | turf.helpers.Feature<turf.helpers.Polygon, turf.helpers.Properties>


// TODO: Handle errors in the populateAlerts route
export const alertRouter = createTRPCRouter({

    populateWorldFireAlertDatabase: publicProcedure
        .query(async ({ ctx }) => {
            const currentDate: string = new Date().toISOString().split('T')[0];
            for (const source of sources) {
                let detectedBy: DetectedBy;
                if (source === 'MODIS_NRT' || source === 'MODIS_SP') {
                    detectedBy = 'MODIS'
                } else if (source === 'VIIRS_SNPP_NRT' || source === 'VIIRS_SNPP_SP' || source === 'VIIRS_NOAA20_NRT') {
                    detectedBy = 'VIIRS'
                } else if (source === 'LANDSAT_NRT') {
                    detectedBy = 'LANDSAT'
                }
                const mapKey = await ctx.prisma.alertProvider.findFirst({
                    where: {
                        slug: source,
                        type: 'fire'
                    }
                })
                const response = await fetch(
                    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`
                );
                const csv = await response.text();
                const parser = parse(csv, { columns: true });
                const records: FireAlert[] = [];
                parser.on("readable", function () {
                    let record;
                    while ((record = parser.read())) {
                        records.push(record);
                    }
                });
                parser.on("error", function (error) {
                    console.error(error);
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Error parsing CSV file",
                    });
                });
                parser.on("end", async function () {
                    if (records.length === 0) {
                        return {
                            message: "No alerts found",
                        };
                    }
                    // Add alerts
                    for (const record of records) {
                        const longitude = parseFloat(record.longitude)
                        const latitude = parseFloat(record.latitude)
                        const eventDate = new Date(record.acq_date) ?? new Date()
                        const frp = parseFloat(record.frp) ?? null
                        let confidenceLevel: ConfidenceLevel;
                        // Assign confidence level based on record.instrument and record.confidence
                        if (detectedBy === 'MODIS') {
                            switch (record.confidence) {
                                case 'h':
                                    confidenceLevel = 'high';
                                    break;
                                case 'm':
                                    confidenceLevel = 'medium';
                                    break;
                                case 'l':
                                    confidenceLevel = 'low';
                                    break;
                            }
                        } else if (detectedBy === 'VIIRS') {
                            switch (record.confidence) {
                                case 'h':
                                    confidenceLevel = 'high';
                                    break;
                                case 'n':
                                    confidenceLevel = 'medium';
                                    break;
                                case 'l':
                                    confidenceLevel = 'low';
                                    break;
                            }
                        } else if (detectedBy === 'LANDSAT') {
                            switch (record.confidence) {
                                case 'H':
                                    confidenceLevel = 'high';
                                    break;
                                case 'M':
                                    confidenceLevel = 'medium';
                                    break;
                                case 'L':
                                    confidenceLevel = 'low';
                                    break;
                            }
                        } else if (detectedBy === 'GEOSTATIONARY') {
                            switch (record.confidence) {
                                case '10':
                                case '30':
                                case '11':
                                case '31':
                                case '13':
                                case '33':
                                case '14':
                                case '34':
                                    confidenceLevel = 'high';
                                    break;
                                case '12':
                                    confidenceLevel = 'medium';
                                    break;
                                case '15':
                                case '35':
                                    confidenceLevel = 'low';
                                    break;
                            }
                        }
                        await ctx.prisma.worldFireAlert.create({
                            data: {
                                latitude: latitude,
                                longitude: longitude,
                                eventDate: eventDate,
                                confidence: confidenceLevel,
                                detectedBy: detectedBy,
                                frp: frp
                            }
                        })
                    }
                })
            }
            return {
                status: 'success',
                message: 'successfully populated world fire alerts'
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

    populateAlerts: publicProcedure
        .query(async ({ ctx }) => {
            const allUncheckedfireAlerts = await ctx.prisma.worldFireAlert.findMany({
                where: {
                    isChecked: false
                }
            })
            const sites = await ctx.prisma.site.findMany();
            if (!sites || sites.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "There are no sites",
                });
            }
            for (const uncheckedFireAlert of allUncheckedfireAlerts) {
                const longitude = uncheckedFireAlert.longitude
                const latitude = uncheckedFireAlert.latitude
                const point = [longitude, latitude]
                const turfPoint = turf.point(point)
                const createdAlerts = [];
                for (const site of sites) {
                    const siteBufferedCoordinates = site.detectionCoordinates;
                    let turfPolygon: TurfMultiPolygonOrPolygon;
                    if (site.type === 'MultiPolygon') {
                        turfPolygon = turf.multiPolygon(siteBufferedCoordinates)
                    } else {
                        turfPolygon = turf.polygon(siteBufferedCoordinates);
                    }
                    const isAlertInsideSite = turf.booleanPointInPolygon(turfPoint, turfPolygon);
                    if (isAlertInsideSite) {
                        createdAlerts.push({
                            type: "fire",
                            eventDate: uncheckedFireAlert.eventDate,
                            detectedBy: uncheckedFireAlert.detectedBy,
                            confidence: uncheckedFireAlert.confidence,
                            latitude: latitude,
                            longitude: longitude,
                            frp: uncheckedFireAlert.frp,
                            siteId: site.id,
                        });
                    }
                }
                if (createdAlerts.length > 0) {
                    await ctx.prisma.alert.createMany({
                        data: createdAlerts,
                    });
                }
                await ctx.prisma.worldFireAlert.update({
                    where: {
                        id: uncheckedFireAlert.id
                    },
                    data: {
                        isChecked: true
                    }
                })
            }
        }),

    // TODO: Find out where the alert is, inside or outside the site coordinates (possibly make a new data field that says how far the alert is compared to the site polygon)
    //`TODO: Send an alert notification to the user regarding the fire alert
    // TODO: Setup a while block to repeat the code above while length of allUncheckedfireAlerts is truthy.

    getAlertsForSite: protectedProcedure
        .input(siteParams)
        .query(async ({ ctx, input }) => {
            try {
                const alertsForSite = await ctx.prisma.alert.findMany({
                    where: {
                        siteId: input.siteId,
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
                let userId: string;

                // Check if user is authenticated with token
                if (ctx.token) {
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        },
                    });
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    userId = account.userId;
                } else if (ctx.session) { // Check if user is authenticated with session
                    userId = ctx.session.user.id;
                } else { // User is not authenticated
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Missing authentication credentials',
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
                    const alertsForEachSite = await ctx.prisma.alert.findMany({
                        where: {
                            siteId: site.id,
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

    deleteAlert: protectedProcedure
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
