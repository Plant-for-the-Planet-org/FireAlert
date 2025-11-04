import type {Site} from '@prisma/client';
import type {Context} from '../../Interfaces/Context';
import type {IPermissionService} from '../interfaces/IPermissionService';
import {SiteNotFoundError, SitePermissionDeniedError} from '../core/errors';

export class PermissionService implements IPermissionService {
  async checkUserHasSitePermission(
    ctx: Context,
    siteId: string,
    userId: string,
  ): Promise<Site> {
    const siteToCRUD = await ctx.prisma.site.findFirst({
      where: {
        id: siteId,
        deletedAt: null,
      },
    });

    if (!siteToCRUD) {
      throw new SiteNotFoundError(siteId);
    }

    if (siteToCRUD?.userId && siteToCRUD.userId !== userId) {
      throw new SitePermissionDeniedError(siteId, userId);
    }

    return siteToCRUD;
  }

  async checkIfPlanetROSite(ctx: Context, siteId: string): Promise<boolean> {
    const siteToCRUD = await ctx.prisma.site.findFirst({
      where: {
        id: siteId,
      },
      select: {
        userId: true,
        projectId: true,
      },
    });

    return !!siteToCRUD?.projectId;
  }
}
