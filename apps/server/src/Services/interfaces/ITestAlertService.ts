import type {SiteAlert} from '@prisma/client';

export interface ITestAlertService {
  getTestSiteAlertCount(userId: string): Promise<number>;

  triggerTestAlert(siteId: string): Promise<SiteAlert>;
}
