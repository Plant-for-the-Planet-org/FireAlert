import { InnerTRPCContext, PPJwtPayload } from "../server/api/trpc";


export interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}