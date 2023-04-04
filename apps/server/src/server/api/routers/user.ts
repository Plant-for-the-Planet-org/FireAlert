import { TRPCError } from "@trpc/server";
import { updateUserSchema } from '../zodSchemas/user.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";

export const userRouter = createTRPCRouter({
    getUser: protectedProcedure
        .query(async ({ ctx }) => {
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
                    if (!account) {
                        throw new TRPCError({
                            code: "NOT_FOUND",
                            message: "Cannot find an account associated with the token",
                        });
                    }
                    //use the account, and find the user that has userId that we got from account
                    const user = await ctx.prisma.user.findFirst({
                        where: {
                            id: account.userId,
                        }
                    })
                    if (user) {
                        return {
                            status: 'success',
                            data: user,
                        }
                    } else {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Cannot find a user associated with the token!'
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
                try {
                    const user = await ctx.prisma.user.findFirst({
                        where: {
                            id: ctx.session!.user.id
                        }
                    })
                    if (user) {
                        return {
                            status: 'success',
                            data: user,
                        }
                    } else {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Cannot find a user associated with the session!'
                        });
                    }
                } catch (error) {
                    console.log(error)
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: 'Cannot get user',
                    });
                }
            }
        }),


    updateUser: protectedProcedure
        .input(updateUserSchema)
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
                    //find the account that has that sub
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
                    const updatedUser = await ctx.prisma.user.update({
                        where: { id: account.userId },
                        data: input.body,
                    });
                    return {
                        status: "success",
                        data: updatedUser,
                    };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Cannot update user with token",
                    });
                }
            } else {
                //when token is not there, default to session logic
                console.log(`Inside updateUser, the sub is ${ctx.token}`);
                try {
                    const updatedUser = await ctx.prisma.user.update({
                        where: { id: ctx.session!.user.id },
                        data: input.body,
                    });
                    return {
                        status: "success",
                        data: updatedUser,
                    };
                } catch (error) {
                    console.log(error);
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Cannot update that user!",
                    });
                }
            }
        }),


    deleteUser: protectedProcedure
        .mutation(async ({ ctx, input }) => {
            try {
                const deletedUser = await ctx.prisma.user.delete({
                    where: { id: ctx.session?.user.id }
                })
                return {
                    status: 'success',
                    data: deletedUser
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Probably user with that Id is not found, so cannot delete user'
                });
            }
        }),

});

export type UserRouter = typeof userRouter


