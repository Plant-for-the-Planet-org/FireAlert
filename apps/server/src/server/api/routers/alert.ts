import { TRPCError } from "@trpc/server";
import { createAlertSchema, params as alertParams, updateAlertSchema } from '../zodSchemas/alert.schema'
import { params as siteParams } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure
} from "../trpc";
import { env } from "../../../env.mjs";
import { parse } from 'csv-parse'
import * as turf from '@turf/turf';
import { Alert, Site } from "@prisma/client";
const sources = ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP']

interface FireAlert {
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

// TODO: Handle errors in the populateAlerts route
export const alertRouter = createTRPCRouter({

    populateAlerts: publicProcedure
        .query(async ({ ctx }) => {
            try{
                const today: Date = new Date();
                const year: number = today.getFullYear();
                const month: number = today.getMonth() + 1;
                const day: number = today.getDate();
    
                const currentDate: string = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                let sites: Site[] = [];
                try {
                    sites = await ctx.prisma.site.findMany();
                    if (!sites || sites.length === 0) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "There are no sites",
                        });
                    }
                } catch (error) {
                    console.error(error);
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Error getting sites from database",
                    });
                }
    
                for (const source of sources) {
                    const response = await fetch(
                        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.MAP_KEY}/${source}/-180,-90,180,90/1/${currentDate}`
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
                                message: "No records found",
                            };
                        }
                        for (const record of records) {
                            const recordPoint = [parseFloat(record.longitude), parseFloat(record.latitude)];
                            const pt = turf.point(recordPoint);
    
                            for (const site of sites) {
                                const siteBufferedCoordinates = site.detectionCoordinates;
                                try {
                                    const py = turf.polygon(siteBufferedCoordinates);
                                    const isAlertInsideSite = turf.booleanPointInPolygon(pt, py);
                                    if (isAlertInsideSite) {
                                        async function existingAlertsForSite(siteId: string): Promise<Alert[] | false> {
                                            const existingAlerts = await ctx.prisma.alert.findMany({
                                                where: {
                                                    siteId: siteId
                                                }
                                            })
                                            if (existingAlerts) {
                                                return existingAlerts
                                            }
                                            return false
                                        }
                                        const existingAlertsList = await existingAlertsForSite(site.id)
                                        if (existingAlertsList) {
                                            // There will only be one alert that has that particular lat, long, and instrument 
                                            const existingAlertToBeUpdated = existingAlertsList.find(
                                                (alert) =>
                                                    alert.latitude === parseFloat(record.latitude) &&
                                                    alert.longitude === parseFloat(record.longitude) &&
                                                    alert.detectedBy === record.instrument
                                            );
                                            // If there is an alert like that, update it, else create it.
                                            if (existingAlertToBeUpdated) {
                                                console.log('updating alert')
                                                await ctx.prisma.alert.update({
                                                    where: {
                                                        id: existingAlertToBeUpdated.id,
                                                    },
                                                    // QUESTION: When to update, and how? 
                                                    // TODO: Confirm when to update, and delete!
                                                    data: {
                                                        eventDate: record.acq_date,
                                                        confidence: record.confidence,
                                                        frp: parseFloat(record.frp),
                                                    },
                                                });
                                            } else {
                                                await ctx.prisma.alert.create({
                                                    data: {
                                                        type: "fire",
                                                        eventDate: record.acq_date,
                                                        detectedBy: record.instrument,
                                                        confidence: record.confidence,
                                                        latitude: parseFloat(record.latitude),
                                                        longitude: parseFloat(record.longitude),
                                                        frp: parseFloat(record.frp),
                                                        siteId: site.id,
                                                    },
                                                });
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error(error);
                                    throw new TRPCError({
                                        code: "INTERNAL_SERVER_ERROR",
                                        message: "Error creating alert in database",
                                    });
                                }
                            }
                        }
                    })
                }
                return {
                    status: 'success',
                    message: 'successfully populated alerts'
                }
            }catch(error){
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
    // TODO: What to do for deleting alerts? How to determine which alert to delete?

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
        .input(alertParams)
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

    updateAlert: protectedProcedure
        .input(updateAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const paramsInput = input.params
                const body = input.body
                const updatedAlert = await ctx.prisma.alert.update({
                    where: { id: paramsInput.alertId },
                    data: body,
                })
                return {
                    status: 'success',
                    data: updatedAlert,
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
        .input(alertParams)
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
