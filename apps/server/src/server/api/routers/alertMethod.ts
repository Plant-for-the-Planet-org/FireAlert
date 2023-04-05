import { TRPCError } from "@trpc/server";
import { createAlertMethodSchema, params, updateAlertMethodSchema } from '../zodSchemas/alertMethod.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";
import { randomUUID } from "crypto";


export const alertMethodRouter = createTRPCRouter({

    createAlertMethod: protectedProcedure
        .input(createAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            // Token logic
            if (ctx.token) {
                try {
                    // Find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    });
                    // Use the account, and create a new alert method with the userId that we got from account
                    const alertMethod = await ctx.prisma.alertMethod.create({
                        data: {
                            guid: "almt_" + randomUUID(),
                            method: input.method,
                            destination: input.destination,
                            isVerified: input.isVerified,
                            isEnabled: input.isEnabled,
                            deviceType: input.deviceType,
                            notificationToken: input.notificationToken,
                            userId: account!.userId,
                        }
                    })
                    return {
                        status: 'success',
                        data: {
                            alertMethod,
                        }
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Probably, alertMethod with that alertMethodId already exists!'
                    });
                }
            } else {
                // When token is not there, default to session logic
                try {
                    const alertMethod = await ctx.prisma.alertMethod.create({
                        data: {
                            guid: "almt_" + randomUUID(),
                            method: input.method,
                            destination: input.destination,
                            isVerified: input.isVerified,
                            isEnabled: input.isEnabled,
                            deviceType: input.deviceType,
                            notificationToken: input.notificationToken,
                            userId: ctx.session!.user.id,
                        }
                    })
                    return {
                        status: 'success',
                        data: {
                            alertMethod,
                        }
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Probably, alertMethod with that alertMethodId already exists!'
                    });
                }
            }
        }),


    getAllAlertMethods: protectedProcedure
        .query(async ({ ctx }) => {
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            if (ctx.token) {
                // token logic
                console.log(`The sub is: ${ctx.token.sub}`);
                try {
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    });
                    const alertMethods = await ctx.prisma.alertMethod.findMany({
                        where: {
                            userId: account?.userId,
                        }
                    });
                    return {
                        status: 'success',
                        data: alertMethods,
                    };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Account Error',
                    });
                }
            } else {
                // session logic
                const userId = ctx.session?.user?.id;
                if (!userId) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "User ID not found in session",
                    });
                }
                try {
                    const alertMethods = await ctx.prisma.alertMethod.findMany({
                        where: {
                            userId: userId,
                        }
                    });
                    return {
                        status: 'success',
                        data: alertMethods,
                    };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Maybe the userid had an error',
                    });
                }
            }
        }),


    getAlertMethod: protectedProcedure
        .input(params)
        .query(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            //token logic
            if (ctx.token) {
                try {
                    //find the account that has that sub
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    })
                    //use the account, and find the alertMethod that has userId that we got from account
                    const alertMethod = await ctx.prisma.alertMethod.findFirst({
                        where: {
                            userId: account?.userId,
                            id: input.alertMethodId
                        }
                    })
                    if (alertMethod) {
                        return {
                            status: 'success',
                            data: alertMethod,
                        }
                    } else {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Cannot find an alert method with that alertMethodId for the user associated with the token!'
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Account Error',
                    });
                }
            } else {
                //when token is not there, default to session logic
                console.log(`Inside getAlertMethod, the sub is ${ctx.token}`)
                try {
                    const alertMethod = await ctx.prisma.alertMethod.findFirst({
                        where: {
                            id: input.alertMethodId,
                            userId: ctx.session!.user.id
                        }
                    })
                    if (alertMethod) {
                        return {
                            status: 'success',
                            data: alertMethod,
                        }
                    } else {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Cannot find an alert method with that alertMethodId for the user associated with the session!'
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Cannot get alert method',
                    });
                }
            }
        }),


    updateAlertMethod: protectedProcedure
        .input(updateAlertMethodSchema)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            //token logic
            if (ctx.token) {
                try {
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        }
                    })
                    try {
                        const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                            where: {
                                id: input.params.alertMethodId,
                                userId: account!.userId,
                            },
                            data: input.body,
                        })
                        return {
                            status: 'success',
                            data: updatedAlertMethod,
                        }
                    } catch (error) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: `${error}`,
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Account Error',
                    });
                }
            } else {
                //when token is not there, default to session logic
                console.log(`Inside updateAlertMethod, the sub is ${ctx.token}`)
                try {
                    const updatedAlertMethod = await ctx.prisma.alertMethod.update({
                        where: {
                            id: input.params.alertMethodId,
                            userId: ctx.session?.user.id
                        },
                        data: input.body,
                    })
                    return {
                        status: 'success',
                        data: updatedAlertMethod,
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `${error}`,
                    });
                }
            }
        }),


    deleteAlertMethod: protectedProcedure
        .input(params)
        .mutation(async ({ ctx, input }) => {
            // Check if user is authenticated
            if (!ctx.token && !ctx.session) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Missing authentication credentials",
                });
            }
            // Token logic
            if (ctx.token) {
                try {
                    const account = await ctx.prisma.account.findFirst({
                        where: {
                            providerAccountId: ctx.token.sub,
                        },
                        select: {
                            userId: true,
                        },
                    });
                    try {
                        const deletedAlertMethod = await ctx.prisma.alertMethod.delete({
                            where: {
                                id: input.alertMethodId,
                                userId: account?.userId
                            },
                        });
                        return {
                            status: "success",
                            data: deletedAlertMethod,
                        };
                    } catch (error) {
                        console.log(error);
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: `${error}`,
                        });
                    }
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Cannot delete alert method",
                    });
                }
            } else {
                // Session logic
                try {
                    const deletedAlertMethod = await ctx.prisma.alertMethod.delete({
                        where: {
                            id: input.alertMethodId,
                            userId: ctx.session?.user.id
                        },
                    });
                    return {
                        status: "success",
                        data: deletedAlertMethod,
                    };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Cannot delete alert method",
                    });
                }
            }
        }),

});
