import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createGeoEventSchema } from "../zodSchemas/geoEvent.schema";
import { GeoEventProvider } from "@prisma/client";
import { createXXHash3 } from "hash-wasm";
import { getSlice } from "../../../utils/routers/geoEvent";

export const geoEventRouter = createTRPCRouter({

    create: protectedProcedure
        .input(createGeoEventSchema)
        // Here user should be able to authenticate with either accesstoken or using the GeoEventProvider Api Key
        // x-client-id should be passed in the header regardless of authentication method

        .mutation(async ({ ctx, input }) => {
            try {
                const { type, latitude, longitude, eventDate: inputEventDate, ...rest } = input;
                const geoEventProviderClientId = ctx.req.headers["x-client-id"];
                const geoEventProviderClientApiKey = ctx.req.headers["x-api-key"];

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
                        message: `Missing x-client-id header`,
                    });
                }

                if (typeof geoEventProviderClientId !== 'string') {
                    throw new TRPCError({ code: "BAD_REQUEST", message: `The value of req.headers['x-client-id'] must be a string` });
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
                    // If provider exists, and provider's clientApiKey is not equal to the apiKey from headers
                    if (provider && provider.clientApiKey !== geoEventProviderClientApiKey) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "Client API Key does not match",
                        });
                    }
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
                const existingEvent = await ctx.prisma.geoEvent.findUnique({ where: { id: checksum } });

                // If the event already exists, send a success message saying the creation process was cancelled
                // Because the event was already stored in our database.
                if (existingEvent) {
                    return {
                        status: 'success',
                        message: 'Cancelled. This event was already present in the database.'
                    }
                }
                // identify in which slice the geoEvent belongs to
                const slice = getSlice(latitude);

                // Create GeoEvent
                const geoEvent = await ctx.prisma.geoEvent.create({
                    data: {
                        type,
                        latitude,
                        longitude,
                        eventDate,
                        ...rest,
                        geoEventProviderId: provider.id,
                        slice,
                        geoEventProviderClientId,
                    },
                });
                // Our database trigger functions automatically creates a geometry column that is a postgis hash
                // made out of latitude and longitude values

                // Return success message with the created geoEvent
                return {
                    status: 'success',
                    data: geoEvent,
                };
            }
            catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
