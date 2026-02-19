import {createNextApiHandler} from '@trpc/server/adapters/next';
import type {CreateNextContextOptions} from '@trpc/server/adapters/next';

import {env} from '../../../env.mjs';
import {createTRPCContext} from '../../../server/api/trpc';
import {appRouter} from '../../../server/api/root';
import {ZodError} from 'zod';
import {logger} from '../../../server/logger';

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: (opts: CreateNextContextOptions) =>
    createTRPCContext(opts, null, false, false),
  onError: opts => {
    const {error, path} = opts;
    logger(`createNextApiHandler `, 'error');
    logger(JSON.stringify(error, null, 2), 'error');

    if (error.cause instanceof ZodError) {
      // Returning only the first Zod error message to the client
      const parsedError = JSON.parse(error.message) as Array<{message: string}>;
      if (parsedError[0]) {
        error.message = parsedError[0].message;
      }
    }

    if (env.NODE_ENV === 'development') {
      console.error(
        `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
      );
    }
  },
});
