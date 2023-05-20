import {TRPCContext} from './Context'

export type CheckUserHasSitePermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};

export type CheckIfPlanetROSiteArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
}