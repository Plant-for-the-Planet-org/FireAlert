import { TRPCError } from '@trpc/server';
import { updateUserSchema } from '../zodSchemas/user.schema';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { returnUser, handleNewUser } from '../../../utils/routers/user';
import { sendAccountDeletionCancellationEmail, sendSoftDeletionEmail } from '../../../utils/notification/userEmails';
import { ensureAdmin } from '../../../utils/routers/trpc'

export const userRouter = createTRPCRouter({

    // profile procedure signs in only clients, but cannot sign in an admin. // However, it logs both client and admin (admin with or without impersonatedUser headers )
    profile: protectedProcedure
        .query(async ({ ctx }) => {
            debugger;
            try {
                // If ctx.user is null, then sign in a new user.
                if (ctx.user === null) {
                    //Signup logic
                    const bearer_token = `Bearer ${ctx.token.access_token}`;
                    return await handleNewUser(bearer_token); //Create New User, fetch projects and sites if PlanetRO
                }
                // If isAdmin is true, either the admin is logging in themselves, or accessing someone else's data
                if (ctx.isAdmin === true) {
                    // If impersonatedUser is null, login the admin themself
                    if (ctx.isImpersonatedUser === false) {
                        const adminUser = ctx.user
                        return {
                            status: 'success',
                            data: adminUser,
                        };
                    }
                    // Here, impersonatedUser is true, so admin is trying to crud the user data. 
                    // Don't undo soft delete if user is softdeleted.
                    const user = ctx.user
                    return {
                        status: 'success',
                        data: user,
                    }
                }
                // Since authorized client is not admin, do normal login concept
                const user = ctx.user
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
                    code: `${error.code}`,
                    message: `${error}`,
                });
            }
        }),

    getAllUsers: protectedProcedure
        .query(async ({ ctx }) => {
            ensureAdmin(ctx)
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
            const userId = ctx.user!.id;
            try {
                const updatedUser = await ctx.prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: input.body,
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
            const userId = ctx.user!.id;
            try {
                const deletedUser = await ctx.prisma.user.update({
                    where: {
                        id: userId,
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
