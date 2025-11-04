import type {Site, SiteAlert, SiteRelation, Prisma} from '@prisma/client';
import * as countries from 'i18n-iso-countries';
import type {Context} from '../../Interfaces/Context';
import {
  SiteNotFoundError,
  SiteAreaExceedsLimitError,
  PlanetROSiteRestrictionError,
} from '../core/errors';
import type {
  ISiteService,
  CreateSiteInput,
  UpdateSiteInput,
  PauseAlertInput,
  CreateProtectedSiteInput,
  UpdateProtectedSiteInput,
  SiteWithProject,
  ProtectedSiteResult,
} from '../interfaces/ISiteService';
import type {IPermissionService} from '../interfaces/IPermissionService';
import type {ITestAlertService} from '../interfaces/ITestAlertService';

export class SiteService implements ISiteService {
  constructor(
    private ctx: Context,
    private permissionService: IPermissionService,
    private testAlertService: ITestAlertService,
  ) {}

  async createSite(
    userId: string,
    input: CreateSiteInput,
  ): Promise<SiteWithProject> {
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
    const result = await this.ctx.prisma.$queryRaw`SELECT ST_Area(
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

    const detectionArea = result[0].area;

    // Check if the detection area exceeds 1 million hectares (10,000 square kilometers)
    if (detectionArea > 1e10) {
      throw new SiteAreaExceedsLimitError(detectionArea);
    }

    const site = await this.ctx.prisma.site.create({
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

    return site;
  }

  async findProtectedSites(userId: string, query: string): Promise<any[]> {
    const results = await this.ctx.prisma.protectedArea.findMany({
      where: {name: {contains: query, mode: 'insensitive'}},
      select: {
        name: true,
        wdpaid: true,
        wdpa_pid: true,
        iso3: true,
        gis_area: true,
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

    return sites;
  }

  async createProtectedSite(
    userId: string,
    input: CreateProtectedSiteInput,
  ): Promise<ProtectedSiteResult> {
    const {remoteId} = input;
    const origin = 'protectedarea';

    const _pa = await this.ctx.prisma.protectedArea.findFirst({
      where: {OR: [{wdpaid: +remoteId}, {wdpa_pid: remoteId}]},
      select: {wdpaid: true, wdpa_pid: true, name: true},
    });

    let geometry;
    if (remoteId === _pa?.wdpa_pid) {
      geometry = await this.ctx.prisma.$queryRaw`
        SELECT ST_AsGeoJSON(ST_ForcePolygonCCW(ST_Union("geom"))) AS geometry
        FROM "ProtectedArea"
        WHERE "WDPA_PID" = ${remoteId}
        GROUP BY "WDPA_PID";`;
    } else {
      geometry = await this.ctx.prisma.$queryRaw`
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

    const foundSite = await this.ctx.prisma.site.findFirst({
      where: {remoteId: remoteId},
    });

    let site: Partial<Site>, siteRelation: Partial<SiteRelation>;

    if (foundSite) {
      const _foundSiteRelation = await this.ctx.prisma.siteRelation.findFirst({
        where: {userId: userId, siteId: foundSite.id},
      });
      if (_foundSiteRelation) {
        site = foundSite;
        siteRelation = _foundSiteRelation;
      } else {
        const _siteRelation = await this.ctx.prisma.siteRelation.create({
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
        const _site = await this.ctx.prisma.site.update({
          where: {id: foundSite.id},
          data: {isMonitored: true},
        });
        site = _site;
        siteRelation = _siteRelation;
      }
    } else {
      const _site = await this.ctx.prisma.site.create({
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

    return {site, siteRelation};
  }

  async getSitesForProject(
    userId: string,
    projectId: string,
  ): Promise<SiteWithProject[]> {
    const sitesForProject = await this.ctx.prisma.site.findMany({
      where: {
        projectId: projectId,
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

    return sitesForProject;
  }

  async getSites(userId: string): Promise<SiteWithProject[]> {
    const sites = await this.ctx.prisma.site.findMany({
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

    return sites;
  }

  async getProtectedSites(userId: string): Promise<any[]> {
    const _siteRelation = await this.ctx.prisma.siteRelation.findMany({
      where: {userId: userId},
      select: {
        siteId: true,
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
      ...el.site,
      isActive: el.isActive,
    }));

    return sites;
  }

  async getSite(userId: string, siteId: string): Promise<SiteWithProject> {
    await this.permissionService.checkUserHasSitePermission(
      this.ctx,
      siteId,
      userId,
    );

    const site = await this.ctx.prisma.site.findFirst({
      where: {
        id: siteId,
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

    if (!site) {
      throw new SiteNotFoundError(siteId);
    }

    return site;
  }

  async updateSite(
    userId: string,
    siteId: string,
    input: UpdateSiteInput,
  ): Promise<SiteWithProject> {
    const site = await this.permissionService.checkUserHasSitePermission(
      this.ctx,
      siteId,
      userId,
    );

    if (!site) {
      throw new SiteNotFoundError(siteId);
    }

    let data: Prisma.SiteUpdateInput = input;

    // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
    const isPlanetROSite = await this.permissionService.checkIfPlanetROSite(
      this.ctx,
      siteId,
    );
    if (isPlanetROSite) {
      const {geometry, type, name, ...rest} = input;
      if (geometry || type || name) {
        throw new PlanetROSiteRestrictionError('update restricted fields');
      }
      data = rest;
    }

    const updatedSite = await this.ctx.prisma.site.update({
      where: {
        id: siteId,
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

    return updatedSite;
  }

  async updateProtectedSite(
    userId: string,
    input: UpdateProtectedSiteInput,
  ): Promise<any> {
    const {siteId, isActive} = input;

    const updatedSiteRelation = await this.ctx.prisma.siteRelation.updateMany({
      where: {siteId: siteId, userId: userId},
      data: {
        isActive: isActive,
      },
    });

    if (updatedSiteRelation.count != 1) {
      return {status: 'failed'};
    }

    const activeSiteRelations = await this.ctx.prisma.siteRelation.findMany({
      where: {siteId: siteId, isActive: true},
    });

    await this.ctx.prisma.site.update({
      where: {id: siteId},
      data: {
        isMonitored: activeSiteRelations.length === 0 ? false : isActive,
      },
    });

    const _siteRelation = await this.ctx.prisma.siteRelation.findFirst({
      where: {siteId: siteId, userId: userId},
      select: {
        siteId: true,
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
      ..._siteRelation?.site,
      isActive: _siteRelation?.isActive,
    };

    return {status: 'success', data: updatedSite};
  }

  async triggerTestAlert(userId: string, siteId: string): Promise<SiteAlert> {
    const site = await this.permissionService.checkUserHasSitePermission(
      this.ctx,
      siteId,
      userId,
    );

    if (!site) {
      throw new SiteNotFoundError(siteId);
    }

    return await this.testAlertService.triggerTestAlert(siteId);
  }

  async pauseAlertForSite(
    input: PauseAlertInput,
  ): Promise<{status: string; message: string}> {
    const {siteId, duration, unit} = input;

    // Calculate the time for the stopAlertUntil field based on unit
    const additionFactor = {
      minutes: 1000 * 60,
      hours: 1000 * 60 * 60,
      days: 1000 * 60 * 60 * 24,
    };

    // Calculate future date based on current time, duration, and unit
    const futureDate = new Date(Date.now() + duration * additionFactor[unit]);

    // Update specific site's stopAlertUntil field in the database
    await this.ctx.prisma.site.update({
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

    return {
      status: 'success',
      message: `Alert has been successfully paused for the site for ${duration} ${durationUnit}.`,
    };
  }

  async deleteSite(
    userId: string,
    siteId: string,
  ): Promise<{status: string; message: string}> {
    await this.permissionService.checkUserHasSitePermission(
      this.ctx,
      siteId,
      userId,
    );

    const isPlanetROSite = await this.permissionService.checkIfPlanetROSite(
      this.ctx,
      siteId,
    );

    if (isPlanetROSite) {
      throw new PlanetROSiteRestrictionError('delete');
    }

    // Soft Delete the site & Alerts associated with it. Set deletedAt to current time
    await this.ctx.prisma.site.update({
      where: {
        id: siteId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // SiteAlert is automatically cascade deleted during db-cleanup, when the site gets permanently deleted,
    // However, notifications are still created when siteAlert is not marked as soft-deleted
    // Therefore, SiteAlerts need to be soft-deleted, as we want to stop creating notifications for soft-deleted sites
    await this.ctx.prisma.siteAlert.updateMany({
      where: {
        siteId: siteId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      status: 'success',
      message: `Site with id ${siteId} deleted successfully`,
    };
  }
}
