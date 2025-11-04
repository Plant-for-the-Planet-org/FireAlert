import type {Site} from '@prisma/client';
import type {Context} from '../../Interfaces/Context';

export interface IPermissionService {
  checkUserHasSitePermission(
    ctx: Context,
    siteId: string,
    userId: string,
  ): Promise<Site>;

  checkIfPlanetROSite(ctx: Context, siteId: string): Promise<boolean>;
}
