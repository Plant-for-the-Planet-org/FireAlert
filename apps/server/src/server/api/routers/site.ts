import {TRPCError} from '@trpc/server';
import {
  createProtectedSiteSchema,
  createSiteSchema,
  findProtectedSiteParams,
  getSitesWithProjectIdParams,
  params,
  pauseAlertInputSchema,
  updateProtectedSiteSchema,
  updateSiteSchema,
} from '../zodSchemas/site.schema';
import {createTRPCRouter, protectedProcedure} from '../trpc';
import {serviceContainer} from '../../../Services/container/ServiceContainer';
import {ErrorHandlingMiddleware} from '../../../Services/core/middleware/ErrorHandlingMiddleware';
import type {Prisma, Site, SiteAlert, SiteRelation} from '@prisma/client';

export const siteRouter = createTRPCRouter({
  createSite: protectedProcedure
    .input(createSiteSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;

      return ErrorHandlingMiddleware.wrapServiceCall(
        async () => {
          const siteService = serviceContainer.createSiteService(ctx);
          const site = await siteService.createSite(userId, input);

          return {
            status: 'success',
            data: site,
          };
        },
        ctx,
        'createSite',
      );
    }),

  findProtectedSites: protectedProcedure
    .input(findProtectedSiteParams)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const {query} = input;
        const siteService = serviceContainer.createSiteService(ctx);
        const sites = await siteService.findProtectedSites(userId, query);

        return {
          status: 'success',
          data: sites,
        };
      } catch (error) {
        console.log(error);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `${error}`,
        });
      }
    }),

  createProtectedSite: protectedProcedure
    .input(createProtectedSiteSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const result = await siteService.createProtectedSite(userId, input);

        return {
          status: 'success',
          data: result,
        };
      } catch (error) {
        console.log({error});

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Something Went Wrong`,
        });
      }
    }),

  getSitesForProject: protectedProcedure
    .input(getSitesWithProjectIdParams)
    .query(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const sitesForProject = await siteService.getSitesForProject(
          userId,
          input.projectId,
        );

        return {
          status: 'success',
          data: sitesForProject,
        };
      } catch (error) {
        console.log(error);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `${error}`,
        });
      }
    }),

  getSites: protectedProcedure.query(async ({ctx}) => {
    const userId = ctx.user!.id;
    try {
      const siteService = serviceContainer.createSiteService(ctx);
      const sites = await siteService.getSites(userId);

      return {
        status: 'success',
        data: sites,
      };
    } catch (error) {
      console.log(error);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${error}`,
      });
    }
  }),

  getProtectedSites: protectedProcedure.query(async ({ctx}) => {
    const userId = ctx.user!.id;
    try {
      const siteService = serviceContainer.createSiteService(ctx);
      const sites = await siteService.getProtectedSites(userId);

      return {
        status: 'success',
        data: sites,
      };
    } catch (error) {
      console.log(error);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `${error}`,
      });
    }
  }),

  getSite: protectedProcedure.input(params).query(async ({ctx, input}) => {
    const userId = ctx.user!.id;
    try {
      const siteService = serviceContainer.createSiteService(ctx);
      const site = await siteService.getSite(userId, input.siteId);

      return {
        status: 'success',
        data: site,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Something Went Wrong`,
      });
    }
  }),

  updateSite: protectedProcedure
    .input(updateSiteSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const updatedSite = await siteService.updateSite(
          userId,
          input.params.siteId,
          input.body,
        );

        return {
          status: 'success',
          data: updatedSite,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Error Updating Site.`,
        });
      }
    }),

  updateProtectedSite: protectedProcedure
    .input(updateProtectedSiteSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const result = await siteService.updateProtectedSite(userId, {
          siteId: input.params.siteId,
          isActive: input.body.isActive,
        });

        return result;
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Error Updating Site.`,
        });
      }
    }),

  triggerTestAlert: protectedProcedure
    .input(params)
    .query(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const alert = await siteService.triggerTestAlert(userId, input.siteId);

        return {
          status: 'success',
          data: alert,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Something Went Wrong`,
        });
      }
    }),

  pauseAlertForSite: protectedProcedure
    .input(pauseAlertInputSchema)
    .mutation(async ({ctx, input}) => {
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const result = await siteService.pauseAlertForSite(input);

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while pausing the alert for the site',
        });
      }
    }),

  deleteSite: protectedProcedure
    .input(params)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const siteService = serviceContainer.createSiteService(ctx);
        const result = await siteService.deleteSite(userId, input.siteId);

        return result;
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Something Went Wrong`,
        });
      }
    }),
});
