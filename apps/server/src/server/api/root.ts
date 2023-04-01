import { createTRPCRouter } from "../../server/api/trpc";
import { exampleRouter } from "../../server/api/routers/example";
import { siteRouter } from "../../server/api/routers/site";
import { alertMethodRouter } from "../../server/api/routers/alertMethod";
import { alertRouter } from "../../server/api/routers/alert";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  site: siteRouter,
  alertMethod: alertMethodRouter,
  alert: alertRouter,
  user: userRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
 