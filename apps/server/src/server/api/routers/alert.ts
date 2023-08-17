import { TRPCError } from "@trpc/server";
import { queryAlertSchema, createAlertSchema } from '../zodSchemas/alert.schema'
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../trpc";
import { getLocalTime, subtractDays } from "../../../utils/date";
import { GeoEventProvider } from "@prisma/client";
import { createXXHash3 } from "hash-wasm";

export const alertRouter = createTRPCRouter({

    getAlerts: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userId = ctx.user!.id;
                const thirtyDaysAgo = subtractDays(new Date(), 30);
                const sitesWithAlerts = await ctx.prisma.site.findMany({
                    where: {
                        userId: userId,
                        deletedAt: null,
                        alerts: {
                            some: {
                                eventDate: {
                                    gte: thirtyDaysAgo,
                                },
                                deletedAt: null,
                            },
                        },
                    },
                    select: {
                        alerts: {
                            select: {
                                id: true,
                                site:{
                                    select:{
                                        id:true,
                                        name: true,
                                        project: {
                                            select: {
                                                id: true,
                                                name: true,
                                            },
                                        }
                                    },
                                },
                                eventDate: true,
                                type: true,
                                latitude: true,
                                longitude: true,
                                detectedBy: true,
                                confidence: true,
                                distance: true,
                                data: true,
                            },
                            where: {
                                eventDate: {
                                    gte: thirtyDaysAgo,
                                },
                                deletedAt: null,
                            }
                        },
                    }
                });
                // Flatten the array of site alerts
                const alertsForUser = sitesWithAlerts.flatMap(site => site.alerts);
                const returnAlertsForUser = alertsForUser.map((alert) => {
                    const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                    return {
                        ...alert,
                        localEventDate: localTime.localDate,
                        localTimeZone: localTime.timeZone,
                    }
                })
                return {
                    status: 'success',
                    data: returnAlertsForUser,
                };
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),


    getAlert: publicProcedure
        .input(queryAlertSchema)
        .query(async ({ ctx, input }) => {
            try {
                const alert = await ctx.prisma.siteAlert.findFirst({
                    where: { 
                        id: input.id 
                    },
                    select: {
                        id: true,
                        site:{
                            select:{
                                id:true,
                                name: true,
                                geometry: true,
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                }
                            },
                        },
                        eventDate: true,
                        type: true,
                        latitude: true,
                        longitude: true,
                        detectedBy: true,
                        confidence: true,
                        distance: true,
                        data: true,
                    }
                })
                if (!alert) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Alert not found`,
                    });
                }
                const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
                const returnAlert = {
                    ...alert,
                    localEventDate: localTime.localDate,
                    localTimeZone: localTime.timeZone,
                }
                return {
                    status: 'success',
                    data: returnAlert,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

        create: protectedProcedure
        .input(createAlertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const {
                    siteId,
                    type,
                    latitude,
                    longitude,
                    eventDate: inputEventDate,
                    detectedBy: geoEventProviderClientId,
                    confidence,
                    ...rest
                } = input;
                const geoEventProviderClientApiKey = ctx.req.headers["x-api-key"];
                
                // Ensure the user is authenticated
                //Authentication ensure user is authenticated either with access token or with GeoEventProviderApiKey
                if (!geoEventProviderClientApiKey && !ctx.user) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: `Missing Authorization header`,
                    });
                }

                if (!geoEventProviderClientId) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: `Missing Provider Client Id Authorization`,
                    });
                }

                // Check whether the User is a GeoEventProviderClient or if the request has a GeoEventProviderApiKey and GeoEventProviderClientId
                // Logic:
                // get geoeventprovider from database where clientId = geoEventProviderClientId and (apiKey = geoEventProviderApiKey or userId = user.id)
                // if no geoeventprovider is found throw error
                // This logic ensures that either a geoEventProviderClient can continue, or that the one accessing this route must have a correct geoEventProviderClientKey

                let provider: (GeoEventProvider | null) = null;

                // If apiKey exists and is a string
                if (geoEventProviderClientApiKey && typeof geoEventProviderClientApiKey === 'string') {
                    // Find provider where clientId and apiKey
                    provider = await ctx.prisma.geoEventProvider.findFirst({
                        where: {
                            clientId: geoEventProviderClientId,
                            clientApiKey: geoEventProviderClientApiKey,
                        },
                    });
                } else if (ctx.user?.id) {
                    // Find provider where clientId and userId
                    provider = await ctx.prisma.geoEventProvider.findFirst({
                        where: {
                            clientId: geoEventProviderClientId,
                            userId: ctx.user?.id,
                        },
                    });
                }

                if (!provider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Provider not found`,
                    });
                }
    
                // Get site from the database using siteId; if not found, throw an error
                const site = await ctx.prisma.site.findUnique({ where: { id: siteId } });
                if (!site) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `Site Not Found`,
                    });
                }

                // To ensure same data isn't stored twice we will use id as a unique identifier
                // generated from a hash of latitude, longitude, eventDate, type and x-client-id
                // This will allow us to store the same event multiple times if it is from different providers
                // but will not store the same event twice from the same provider

                // Create checksum
                const hasher = await createXXHash3();
                hasher.init();  // Reset the hasher
                const eventDate = inputEventDate ? inputEventDate : new Date()
                const checksum = hasher.update(
                    latitude.toString() +
                    longitude.toString() +
                    eventDate.toISOString() +
                    type +
                    geoEventProviderClientId
                ).digest('hex');

                // Verify if the event already exists
                const existingSiteAlert = await ctx.prisma.siteAlert.findUnique({ where: { id: checksum } });

                // If the event already exists, send a success message saying the creation process was cancelled
                // Because the event was already stored in our database.
                if (existingSiteAlert) {
                    return {
                        status: 'success',
                        message: 'Cancelled. This alert was already present in the database.'
                    }
                }
    
                // Create SiteAlert
                const siteAlert = await ctx.prisma.siteAlert.create({
                    data: {
                        siteId,
                        type,
                        latitude,
                        longitude,
                        eventDate: eventDate,
                        detectedBy: geoEventProviderClientId,
                        confidence,
                        ...rest,
                        isProcessed: false,
                    },
                });
    
                // Return success message with the created siteAlert
                return {
                    status: 'success',
                    data: siteAlert,
                };
            }
            catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // If the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // If it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
