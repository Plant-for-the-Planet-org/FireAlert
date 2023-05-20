import { TRPCContext } from "./Context";
import { AlertMethod } from "@prisma/client";

export type CheckUserHasAlertMethodPermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    alertMethodId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};

export type CtxWithAlertMethod = {
    ctx: TRPCContext;
    alertMethod: AlertMethod;
}

export type CtxWithAlertMethodId = {
    ctx: TRPCContext;
    alertMethodId: string
}

export type CtxWithUserID = {
    ctx: TRPCContext;
    userId: string;
    count: number;
}