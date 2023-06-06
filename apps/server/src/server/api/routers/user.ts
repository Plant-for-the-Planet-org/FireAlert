import { TRPCError } from '@trpc/server';
import { updateUserSchema } from '../zodSchemas/user.schema';
import { adminProcedure, createTRPCRouter, protectedProcedure, userProcedure } from '../trpc';
import { getUser, returnUser, handleNewUser } from '../../../utils/routers/user';
import { type Prisma } from '@prisma/client';
import { sendAccountDeletionCancellationEmail, sendSoftDeletionEmail } from '../../../utils/notification/userEmails';

export const userRouter = createTRPCRouter({

    profile: userProcedure
        .query(async ({ ctx }) => {
            try {
                const user = await ctx.prisma.user.findFirst({ where: { sub: ctx.token.sub } });
                const bearer_token = `Bearer ${ctx.token.access_token}`;
                if (!user) {
                    return await handleNewUser(ctx, bearer_token); //Create New User, fetch projects and sites if PlanetRO
                }

                // If user is deleted, send account deletion cancellation email
                if (user.deletedAt) {
                    await sendAccountDeletionCancellationEmail(user);
                }

                // Update lastLogin to current date and set deletedAt to null, then return user
                const returnedUser = await ctx.prisma.user.update({
                    where: { sub: ctx.token.sub },
                    data: {
                        lastLogin: new Date(),
                        deletedAt: null,
                    },
                });

                const loggedInUser = returnUser(returnedUser);

                return {
                    status: 'success',
                    data: loggedInUser,
                };

            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),



    getAllUsers: adminProcedure
        .query(async ({ ctx }) => {
            try {
                const users = await ctx.prisma.user.findMany();
                return {
                    status: 'success',
                    data: users,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    updateUser: protectedProcedure
        .input(updateUserSchema)
        .mutation(async ({ ctx, input }) => {
            const user = await getUser(ctx)
            let body: Prisma.UserUpdateInput = {};
            if (input.body.detectionMethods) {
                const { detectionMethods, ...rest } = input.body
                body = {
                    detectionMethods: detectionMethods,
                    ...rest,
                }
            } else {
                body = input.body
            }
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: body,
                });
                const returnedUser = returnUser(updatedUser)
                return {
                    status: 'success',
                    data: returnedUser
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `${error}`,
                });
            }
        }),

    softDeleteUser: protectedProcedure
        .mutation(async ({ ctx }) => {
            const user = await getUser(ctx)
            try {
                const deletedUser = await ctx.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        deletedAt: new Date(),
                    },
                });
                if (!deletedUser) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `Error in deletion process. Cannot delete user`,
                    });
                } else {
                    // Send Email
                    const emailSent = await sendSoftDeletionEmail(deletedUser);

                    return {
                        status: 'Success',
                        message: `User ${deletedUser.id} will be permanently deleted in 7 days. ${emailSent ? 'Successfully sent email' : ''}`,
                        data: null
                    };
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

export type UserRouter = typeof userRouter;
