import {createTRPCRouter} from '../../server/api/trpc';
import {siteRouter} from '../../server/api/routers/site';
import {alertMethodRouter} from '../../server/api/routers/alertMethod';
import {alertRouter} from '../../server/api/routers/alert';
import {userRouter} from './routers/user';
import {projectRouter} from './routers/project';
import {geoEventProviderRouter} from './routers/geoEventProvider';
import {siteIncidentRouter} from './routers/siteIncident';
import {devRouter} from './routers/dev/dev';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  site: siteRouter,
  alertMethod: alertMethodRouter,
  alert: alertRouter,
  user: userRouter,
  project: projectRouter,
  geoEventProvider: geoEventProviderRouter,
  siteIncident: siteIncidentRouter,
  dev: devRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
