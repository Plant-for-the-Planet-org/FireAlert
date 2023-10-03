import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "../../../env.mjs";
import { createTRPCContext } from "../../../server/api/trpc";
import { appRouter } from "../../../server/api/root";
import { ZodError } from "zod";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
  (opts) => {
    const { error, path } = opts;
    console.error("Error:", error);

    if (error.cause instanceof ZodError) {
      // Returning only the first Zod error message to the client
      error.message = JSON.parse(error.message)[0].message;
    }

    if(env.NODE_ENV === "development"){
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
      );
    }
  },
});
