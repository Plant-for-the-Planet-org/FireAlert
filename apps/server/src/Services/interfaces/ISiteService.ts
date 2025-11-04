import type {Site, SiteAlert, SiteRelation, Prisma} from '@prisma/client';

export interface CreateSiteInput {
  type: string;
  name: string;
  geometry: Prisma.JsonObject;
  radius: number;
  isMonitored: boolean;
}

export interface UpdateSiteInput {
  name?: string;
  type?: string;
  geometry?: Prisma.JsonObject;
  radius?: number;
  isMonitored?: boolean;
}

export interface PauseAlertInput {
  siteId: string;
  duration: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface CreateProtectedSiteInput {
  remoteId: string;
}

export interface UpdateProtectedSiteInput {
  siteId: string;
  isActive: boolean;
}

export interface SiteWithProject extends Site {
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface ProtectedSiteResult {
  site: Partial<Site>;
  siteRelation: Partial<SiteRelation>;
}

export interface ISiteService {
  createSite(userId: string, input: CreateSiteInput): Promise<SiteWithProject>;

  findProtectedSites(userId: string, query: string): Promise<any[]>;

  createProtectedSite(
    userId: string,
    input: CreateProtectedSiteInput,
  ): Promise<ProtectedSiteResult>;

  getSitesForProject(
    userId: string,
    projectId: string,
  ): Promise<SiteWithProject[]>;

  getSites(userId: string): Promise<SiteWithProject[]>;

  getProtectedSites(userId: string): Promise<any[]>;

  getSite(userId: string, siteId: string): Promise<SiteWithProject>;

  updateSite(
    userId: string,
    siteId: string,
    input: UpdateSiteInput,
  ): Promise<SiteWithProject>;

  updateProtectedSite(
    userId: string,
    input: UpdateProtectedSiteInput,
  ): Promise<any>;

  triggerTestAlert(userId: string, siteId: string): Promise<SiteAlert>;

  pauseAlertForSite(
    input: PauseAlertInput,
  ): Promise<{status: string; message: string}>;

  deleteSite(
    userId: string,
    siteId: string,
  ): Promise<{status: string; message: string}>;
}
