import { TRPCError } from "@trpc/server";
import { createGeoEventProviderSchema, updateGeoEventProviderSchema, geoEventProviderParamsSchema } from '../zodSchemas/geoEventProvider.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import { randomUUID } from "crypto";
import { type TRPCContext } from "../../../../src/Interfaces/Context";

// Users 

export function checkUserOwnsProvider(ctx: TRPCContext, id: string) {
    return ctx.prisma.geoEventProvider.findFirst({
        where: {
            id: id,
            userId: ctx.user!.id,
        }
    });
}

export const geoEventProviderRouter = createTRPCRouter({

    create: protectedProcedure
        .input(createGeoEventProviderSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const { name, description, isActive } = input;
                const userId = ctx.user!.id ?? null;
                const geoEventProvider = await ctx.prisma.geoEventProvider.create({
                    data: {
                        name,
                        description,
                        type: "fire",
                        isActive: isActive ? isActive : false ,
                        clientApiKey: randomUUID(),
                        clientId: randomUUID(),
                        fetchFrequency: null,
                        config: {},
                        userId: userId,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        isActive: true,
                        clientApiKey: true,
                        clientId: true,
                    },
                });

                return geoEventProvider;

            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    update: protectedProcedure
        .input(updateGeoEventProviderSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const id = input.params.id;
                const body = input.body;
                const userId = ctx.user!.id;
                //check if user owns the geoEventProvider
                const geoEventProvider = await checkUserOwnsProvider(ctx, id);
                if (!geoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist",
                    });
                }
                const updatedGeoEventProvider = await ctx.prisma.geoEventProvider.update({
                    where: {
                        id: id,
                    },
                    data: body,
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        isActive: true,
                        clientApiKey: true,
                        clientId: true,
                    }
                });
                return updatedGeoEventProvider;
            } catch (error) {
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

    get: protectedProcedure
        .input(geoEventProviderParamsSchema)
        .query(async ({ ctx, input }) => {
            try {
                const geoEventProvider = await checkUserOwnsProvider(ctx, input.id);
                if (!geoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist",
                    });
                }
                return {
                    status: "success",
                    data: geoEventProvider,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `${error}`,
                });
            }
        }),

    list: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const geoEventProviders = await ctx.prisma.geoEventProvider.findMany(
                    {
                        where: {
                            userId: ctx.user!.id,
                        },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            type: true,
                            isActive: true,
                            clientApiKey: true,
                            clientId: true,
                        }
                    }
                );
                return geoEventProviders;
            } catch (error) {
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

    rollApiKey: protectedProcedure
        .input(geoEventProviderParamsSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                //check if user owns the geoEventProvider
                const geoEventProvider = await checkUserOwnsProvider(ctx, input.id);
                if (!geoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist",
                    });
                }
                //roll Api Key
                const updatedGeoEventProvider = await ctx.prisma.geoEventProvider.update({
                    where: {
                        id: input.id
                    },
                    data: {
                        clientApiKey: randomUUID(),
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        type: true,
                        isActive: true,
                        clientApiKey: true,
                        clientId: true,
                    },
                });

                return {
                    status: "success",
                    data: updatedGeoEventProvider,
                };
            } catch (error) {
                console.log(error);
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `${error}`,
                });
            }
        }),

    delete: protectedProcedure
        .input(geoEventProviderParamsSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                //check if user owns the geoEventProvider
                const geoEventProvider = await checkUserOwnsProvider(ctx, input.id);
                if (!geoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist",
                    });
                }
                //delete geoEventProvider
                const deletedGeoEventProvider = await ctx.prisma.geoEventProvider.delete({
                    where: {
                        id: input.id,
                    },
                });
                return {
                    status: "success",
                    message: `GeoEventProvider with id ${deletedGeoEventProvider.id} has been deleted.`,
                };
            } catch (error) {
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

})