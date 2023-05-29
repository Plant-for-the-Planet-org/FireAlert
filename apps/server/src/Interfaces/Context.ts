import { InnerTRPCContext } from "../server/api/trpc";
import { PPJwtPayload } from "../utils/routers/trpc"

export interface TRPCContext extends InnerTRPCContext {
    token: PPJwtPayload;
}