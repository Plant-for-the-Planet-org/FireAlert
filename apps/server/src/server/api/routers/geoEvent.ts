import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createGeoEventSchema } from "../zodSchemas/geoEvent.schema";
import { prisma } from "../../../../src/server/db";
import { type GeoEventProvider } from "@prisma/client";

export const geoEventRouter = createTRPCRouter({

    create: protectedProcedure
        .input(createGeoEventSchema)
        // Here user should be able to authenticate with either accesstoken or using the GeoEventProvider Api Key
        // x-client-id should be passed in the header regardless of authentication method
    
        .mutation(async ({ ctx, input }) => {
            try {
                const { type, latitude, longitude, eventDate, geometry, confidence, radius, data} = input;
                const geoEventProviderClientId = ctx.req.headers["x-client-id"];
                const geoEventProviderApiKey = ctx.req.headers["x-api-key"];

                //Authentication ensure user is authenticated either with access token or with GeoEventProviderApiKey
                if (!geoEventProviderApiKey && !user) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: `Missing Authorization header`,
                    });
                }

                // get geoeventprovider from database where clientId = geoEventProviderClientId 
                // and (apiKey = geoEventProviderApiKey or userId = user.id)
                // if no geoeventprovider is found throw error
                // if geoeventprovider is found and apiKey is not equal to geoEventProviderApiKey
                // throw error
                // if geoeventprovider is found and userId is not equal to user.id continue normally
                // if geoeventprovider is found and userId is equal to user.id continue normally
                
                const provider: GeoEventProvider = prisma.geoEventProvider.findFirst({
                    where: {
                        AND: [
                            { clientId: geoEventProviderClientId },
                            {
                                OR: [
                                    { clientApiKey: geoEventProviderApiKey },
                                    { userId: user.id }
                                ]
                            }
                        ]
                    }
                });
                
                

            

                if (!geoEventProviderClientId) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: `Missing x-client-id header`,
                    });
                }


                // To ensure same data isn't stored twice we will use id as a unique identifier
                // generated from a hash of latitude, longitude, eventDate, type and x-client-id
                // This will allow us to store the same event multiple times if it is from different providers
                // but will not store the same event twice from the same provider
                
                // identify in which slice the geoEvent belongs to
                // const slice = await getSlice({ latitude, longitude });


            }
            catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),
});
