import { TRPCError } from "@trpc/server";
import { createGeoEventProviderSchema, updateGeoEventProviderSchema, geoEventProviderParamsSchema } from '../zodSchemas/geoEventProvider.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import {ensureAdmin} from '../../../utils/routers/trpc'

// Every procedure in geoEventProvider Router must be an admin only procedure
// We implement this check by using the ensureAdmin function

export const geoEventProviderRouter = createTRPCRouter({

    createGeoEventProvider: protectedProcedure
        .input(createGeoEventProviderSchema)
        .mutation(async ({ ctx, input }) => {
            ensureAdmin(ctx)
            try {
                const { type, isActive, providerKey, config } = input;
                const geoEventProvider = await ctx.prisma.geoEventProvider.create({
                    data: {
                        type,
                        isActive,
                        providerKey,
                        config,
                    },
                });
                return {
                    status: "success",
                    data: geoEventProvider,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    updateGeoEventProvider: protectedProcedure
        .input(updateGeoEventProviderSchema)
        .mutation(async ({ ctx, input }) => {
            ensureAdmin(ctx)
            try {
                const { params, body } = input;

                const geoEventProvider = await ctx.prisma.geoEventProvider.findUnique({
                    where: {
                        id: params.id,
                    },
                });

                if (!geoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist, cannot update GeoEventProvider",
                    });
                }

                const updatedGeoEventProvider = await ctx.prisma.geoEventProvider.update({
                    where: {
                        id: params.id,
                    },
                    data: body,
                });

                return {
                    status: "success",
                    data: updatedGeoEventProvider,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Something Went Wrong.`,
                });
            }
        }),

    getGeoEventProviders: protectedProcedure
        .query(async ({ ctx }) => {
            ensureAdmin(ctx)
            try {
                const geoEventProviders = await ctx.prisma.geoEventProvider.findMany();

                return {
                    status: "success",
                    data: geoEventProviders,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Something Went Wrong`,
                });
            }
        }),

    getGeoEventProvider: protectedProcedure
        .input(geoEventProviderParamsSchema)
        .query(async ({ ctx, input }) => {
            ensureAdmin(ctx)
            try {
                const geoEventProvider = await ctx.prisma.geoEventProvider.findUnique({
                    where: {
                        id: input.id,
                    },
                });

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
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Something Went Wrong`,
                });
            }
        }),

    deleteGeoEventProvider: protectedProcedure
        .input(geoEventProviderParamsSchema)
        .mutation(async ({ ctx, input }) => {
            ensureAdmin(ctx)
            try {
                const deletedGeoEventProvider = await ctx.prisma.geoEventProvider.delete({
                    where: {
                        id: input.id,
                    },
                });
                if (!deletedGeoEventProvider) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "GeoEventProvider with that id does not exist",
                    });
                }
                return {
                    status: "success",
                    message: `GeoEventProvider with id ${deletedGeoEventProvider.id} has been deleted.`,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Something Went Wrong`,
                });
            }
        }),

})