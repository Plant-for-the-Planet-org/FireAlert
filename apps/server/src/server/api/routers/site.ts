import type { Prisma, Site, SiteAlert, SiteRelation } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import * as countries from 'i18n-iso-countries';
import {
  checkIfPlanetROSite,
  checkUserHasSitePermission,
  triggerTestAlert,
} from '../../../utils/routers/site';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import {
  createProtectedSiteSchema,
  createSiteSchema,
  deleteProtectedSiteSchema,
  findProtectedSiteParams,
  getSitesWithProjectIdParams,
  params,
  pauseAlertInputSchema,
  pauseProtectedSiteAlertSchema,
  updateSiteSchema
} from '../zodSchemas/site.schema';

export const siteRouter = createTRPCRouter({
  createSite: protectedProcedure
    .input(createSiteSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const origin = 'firealert';
        const lastUpdated = new Date();
        let radius = 0;
        // radius 0 on Point would generally not return any results
        // So monitor 1km around the point by default

        if (input.type === 'Point' && input.radius === 0) {
          radius = 1000;
        } else {
          radius = input.radius;
        }

        // Convert geometry to GeoJSON string for PostGIS function
        const geometryGeoJSON = JSON.stringify(input.geometry);

        // Calculate detection area using PostGIS
        const result = await ctx.prisma.$queryRaw`SELECT ST_Area(
                    ST_Transform(
                        ST_Buffer(
                        ST_Transform(
                            ST_SetSRID(
                            ST_GeomFromGeoJSON(${geometryGeoJSON}::text),
                            4326
                            ),
                            3857
                        ),
                        ${input.radius}
                        ),
                        3857
                    )
                    ) AS area`;

        const detectionArea = result[0].area; // Assuming result is an array with the area as its first item

        // Check if the detection area exceeds 1 million hectares (10,000 square kilometers)
        if (detectionArea > 1e10) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Site area exceeds the maximum allowed size of 1 million hectares.',
          });
        }
        const site = await ctx.prisma.site.create({
          data: {
            origin: origin,
            type: input.type,
            name: input.name,
            geometry: input.geometry,
            radius: radius,
            isMonitored: input.isMonitored,
            userId: userId,
            lastUpdated: lastUpdated,
          },
          select: {
            id: true,
            name: true,
            type: true,
            radius: true,
            isMonitored: true,
            lastUpdated: true,
            userId: true,
            remoteId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            geometry: true,
          },
        });

        return {
          status: 'success',
          data: site,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Something Went Wrong`,
        });
      }
    }),

  findProtectedSites: protectedProcedure
    .input(findProtectedSiteParams)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      try {
        const {query} = input;

        // const results = null;
        const results = await ctx.prisma.protectedArea.findMany({
          where: {name: {contains: query, mode: 'insensitive'}},
          select: {
            name: true,
            wdpaid: true,
            wdpa_pid: true,
            iso3: true,
            gis_area: true,
            // geom: true,
          },
        });

        const sites = results.map(el => ({
          ...el,
          country: countries.getName(el.iso3!, 'en'),
          areaInHectare: new Intl.NumberFormat('en', {
            style: 'unit',
            unit: 'hectare',
            unitDisplay: 'short',
            maximumFractionDigits: 2,
          }).format(+el.gis_area! * 100),
          remoteId: el.wdpa_pid,
        }));

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
        const {remoteId} = input;

        const origin = 'protectedarea';

        const _pa = await ctx.prisma.protectedArea.findFirst({
          where: {OR: [{wdpaid: +remoteId}, {wdpa_pid: remoteId}]},
          select: {wdpaid: true, wdpa_pid: true, name: true},
        });

        let geometry;
        if (remoteId === _pa?.wdpa_pid) {
          geometry = await ctx.prisma.$queryRaw`
                        SELECT ST_AsGeoJSON(ST_ForcePolygonCCW(ST_Union("geom"))) AS geometry
                        FROM "ProtectedArea"
                        WHERE "WDPA_PID" = ${remoteId}
                        GROUP BY "WDPA_PID";`;
        } else {
          geometry = await ctx.prisma.$queryRaw`
                        SELECT ST_AsGeoJSON(ST_ForcePolygonCCW(ST_Union(geom))) AS geometry
                        FROM protectedarea
                        WHERE wdpapid = ${+remoteId}
                        GROUP BY wdpapid;`;
        }

        const protectedArea = {
          name: _pa?.name,
          wdpaid: _pa?.wdpaid,
          wdpa_pid: _pa?.wdpa_pid,
          geometry: JSON.parse(geometry[0]?.geometry),
        };

        const foundSite = await ctx.prisma.site.findFirst({
          where: {remoteId: remoteId},
        });

        let site: Partial<Site>, siteRelation: Partial<SiteRelation>;

        if (foundSite) {
          const _foundSiteRelation = await ctx.prisma.siteRelation.findFirst({
            where: {userId: userId, siteId: foundSite.id, deletedAt: null},
          });
          if (_foundSiteRelation) {
            site = foundSite;
            siteRelation = _foundSiteRelation;
          } else {
            const _siteRelation = await ctx.prisma.siteRelation.create({
              data: {
                role: 'ROLE_VIEWER',
                userId: userId,
                siteId: foundSite.id,
                isActive: true,
              },
              select: {
                siteId: true,
                userId: true,
                role: true,
                site: {
                  select: {
                    id: true,
                    type: true,
                    name: true,
                    radius: true,
                    geometry: true,
                    remoteId: true,
                  },
                },
              },
            });
            const _site = await ctx.prisma.site.update({
              where: {id: foundSite.id},
              data: {isMonitored: true},
            });
            site = _site;
            siteRelation = _siteRelation;
          }
        } else {
          const _site = await ctx.prisma.site.create({
            data: {
              origin: origin,
              type: 'Polygon',
              name: protectedArea.name,
              radius: 0,
              geometry: protectedArea.geometry as unknown as Prisma.JsonObject,
              remoteId: protectedArea.wdpa_pid,
              lastUpdated: new Date(),
              siteRelations: {
                create: {
                  user: {connect: {id: userId}},
                  role: 'ROLE_VIEWER',
                },
              },
            },
            select: {
              id: true,
              type: true,
              name: true,
              radius: true,
              geometry: true,
              remoteId: true,
              lastUpdated: true,
              project: {
                select: {id: true, name: true},
              },
              siteRelations: {
                select: {siteId: true, userId: true, role: true},
              },
            },
          });
          site = _site;
          siteRelation = _site.siteRelations;
        }

        return {
          status: 'success',
          data: {site, siteRelation},
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
        // Only returns a list of sites if the user has sites with the inputted projectId, else returns not found.
        // TODO: test when this returns an empty array, and when it throws an error.
        const sitesForProject = await ctx.prisma.site.findMany({
          where: {
            projectId: input.projectId,
            deletedAt: null,
            userId: userId,
          },
          select: {
            id: true,
            name: true,
            type: true,
            radius: true,
            isMonitored: true,
            lastUpdated: true,
            userId: true,
            remoteId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            geometry: true,
          },
        });
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
      const sites = await ctx.prisma.site.findMany({
        where: {
          userId: userId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          type: true,
          radius: true,
          isMonitored: true,
          lastUpdated: true,
          userId: true,
          remoteId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          geometry: true,
        },
      });
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
      // console.log(userId)
      const _siteRelation = await ctx.prisma.siteRelation.findMany({
        where: {
          userId: userId,
          deletedAt: null,
        },
        select: {
          id: true,
          siteId: true,
          userId: true,
          isActive: true,
          site: {
            select: {
              id: true,
              name: true,
              type: true,
              isMonitored: true,
              userId: true,
              remoteId: true,
              project: true,
              geometry: true,
            },
          },
        },
      });

      const sites = _siteRelation.map(el => ({
        siteRelationId: el.id,
        siteId: el.siteId,
        isActive: el.isActive,
        ...el.site,
        userId: el.userId,
      }));

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
      await checkUserHasSitePermission({
        ctx,
        siteId: input.siteId,
        userId: userId,
      });
      const site = await ctx.prisma.site.findFirst({
        where: {
          id: input.siteId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          type: true,
          radius: true,
          isMonitored: true,
          lastUpdated: true,
          userId: true,
          remoteId: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          geometry: true,
        },
      });
      if (site) {
        return {
          status: 'success',
          data: site,
        };
      } else {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Cannot find a site with that siteId for the user associated with the ${
            ctx.token ? 'token' : 'session'
          }!`,
        });
      }
    } catch (error) {
      console.log(error);
      if (error instanceof TRPCError) {
        // if the error is already a TRPCError, just re-throw it
        throw error;
      }
      // if it's a different type of error, throw a new TRPCError
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
      const site = await checkUserHasSitePermission({
        ctx,
        siteId: input.params.siteId,
        userId: userId,
      });
      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site with that id does not exist, cannot update site',
        });
      }
      try {
        let updatedData = input.body;
        // Initialize data
        let data: Prisma.SiteUpdateInput = updatedData;
        // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
        const isPlanetROSite = await checkIfPlanetROSite({
          ctx,
          siteId: input.params.siteId,
        });
        if (isPlanetROSite) {
          const {geometry, type, name, ...rest} = updatedData;
          if (geometry || type || name) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: `PlanetRO Users can only update Radius and isMonitored Field`,
            });
          }
          data = rest;
        }
        // Update the site using the modified data object
        const updatedSite = await ctx.prisma.site.update({
          where: {
            id: input.params.siteId,
          },
          data: data,
          select: {
            id: true,
            name: true,
            type: true,
            radius: true,
            isMonitored: true,
            lastUpdated: true,
            userId: true,
            remoteId: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            geometry: true,
          },
        });
        return {
          status: 'success',
          data: updatedSite,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Error Updating Site.`,
        });
      }
    }),

  pauseAlertForProtectedSite: protectedProcedure
    .input(pauseProtectedSiteAlertSchema)
    .mutation(async ({ctx, input}) => {
      const userId = ctx.user!.id;
      const siteRelationId = input.params.siteRelationId;
      const siteId = input.params.siteId;
      try {
        const updatedSiteRelation = await ctx.prisma.siteRelation.updateMany({
          where: {id: siteRelationId, siteId: siteId, userId: userId},
          data: {
            isActive: input.body.isActive,
          },
        });

        if (updatedSiteRelation.count != 1) {
          return {status: 'failed'};
        }

        const activeSiteRelations = await ctx.prisma.siteRelation.findMany({
          where: {siteId: input.params.siteId, isActive: true, deletedAt: null},
        });

        await ctx.prisma.site.update({
          where: {id: siteId},
          data: {
            isMonitored:
              activeSiteRelations.length === 0 ? false : true,
          },
        });

        const _siteRelation = await ctx.prisma.siteRelation.findFirst({
          where: {siteId: siteId, userId: userId, deletedAt: null},
          select: {
            id: true,
            siteId: true,
            userId: true,
            isActive: true,
            site: {
              select: {
                id: true,
                name: true,
                type: true,
                isMonitored: true,
                userId: true,
                remoteId: true,
                project: true,
                geometry: true,
              },
            },
          },
        });

        const updatedSite = {
          siteRelationId: _siteRelation?.id,
          siteId: _siteRelation?.siteId,
          userId: _siteRelation?.userId,
          ..._siteRelation?.site,
          isActive: _siteRelation?.isActive,
        };

        return {status: 'success', data: updatedSite};
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
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
      const site = await checkUserHasSitePermission({
        ctx,
        siteId: input.siteId,
        userId: userId,
      });
      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site with that id does not exist, cannot trigger alert',
        });
      }
      try {
        const alert: SiteAlert = await triggerTestAlert(input.siteId);
        return {
          status: 'success',
          data: alert,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
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
        // Destructure input parameters, including siteId
        const {siteId, duration, unit} = input;

        // Calculate the time for the stopAlertUntil field based on unit
        const additionFactor = {
          minutes: 1000 * 60,
          hours: 1000 * 60 * 60,
          days: 1000 * 60 * 60 * 24,
        };

        // Calculate future date based on current time, duration, and unit
        const futureDate = new Date(
          Date.now() + duration * additionFactor[unit],
        );

        // Update specific site's stopAlertUntil field in the database
        await ctx.prisma.site.update({
          where: {
            id: siteId,
          },
          data: {
            stopAlertUntil: futureDate,
          },
        });
        // Constructing a readable duration message
        const durationUnit =
          unit === 'minutes' && duration === 1
            ? 'minute'
            : unit === 'hours' && duration === 1
            ? 'hour'
            : unit === 'days' && duration === 1
            ? 'day'
            : unit;

        // Respond with a success message including pause duration details
        return {
          status: 'success',
          message: `Alert has been successfully paused for the site for ${duration} ${durationUnit}.`,
        };
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
      // Check if user is authenticated and not soft deleted
      const userId = ctx.user!.id;
      await checkUserHasSitePermission({
        ctx,
        siteId: input.siteId,
        userId: userId,
      });
      const isPlanetROSite = await checkIfPlanetROSite({
        ctx,
        siteId: input.siteId,
      });

      if (isPlanetROSite) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message:
            'FireAlert cannot delete Site fetched from Plant-for-the-Planet, Please delete it from Plant-for-the-Planet Platform',
        });
      }
      try {
        // Soft Delete the site & Alerts associated with it. Set deletedAt to current time
        await ctx.prisma.site.update({
          where: {
            id: input.siteId,
          },
          data: {
            deletedAt: new Date(),
          },
        });
        // SiteAlert is automatically cascade deleted during db-cleanup, when the site gets permanently deleted,
        // However, notifications are still created when siteAlert is not marked as soft-deleted
        // Therefore, SiteAlerts need to be soft-deleted, as we want to stop creating notifications for soft-deleted sites
        await ctx.prisma.siteAlert.updateMany({
          where: {
            siteId: input.siteId,
          },
          data: {
            deletedAt: new Date(),
          },
        });

        return {
          status: 'success',
          message: `Site with id ${input.siteId} deleted successfully`,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Something Went Wrong`,
        });
      }
    }),

  deleteProtectedSite: protectedProcedure
    .input(deleteProtectedSiteSchema)
    .mutation(async ({ctx, input}) => {
      console.log('deleteProtectedSite', input);
      const siteRelationId = input.params.siteRelationId;
      const siteId = input.params.siteId;
      const userId = ctx.user!.id;
      try {
        const updatedSiteRelation = await ctx.prisma.siteRelation.updateMany({
          where: {id: siteRelationId, siteId: siteId, userId: userId, deletedAt: null},
          data: {deletedAt: new Date(), isActive: false},
        });
        if( updatedSiteRelation.count != 1) {
          return {status: 'failed'};
        } else {
          // TODO: Delete Notification scheduled for this protected site through site relation.
          // Why Can't delete SiteAlert = That site might be watched by other thru different SiteRelation
          // SiteRelationId -> SiteReltion -> Site -> SiteAlert -> Notifications 
          // UserID -> User -> AlertMethod -> Notifications 
          // Compare Notifications thru relations & delete ones not needed.
        }
        return {
          status: 'success',
          message: `Protected Site with id ${siteId} deleted successfully`,
        };
      } catch (error) {
        console.log(error);
        if (error instanceof TRPCError) {
          // if the error is already a TRPCError, just re-throw it
          throw error;
        }
        // if it's a different type of error, throw a new TRPCError
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Something Went Wrong`,
        });
      }
    }),
});
