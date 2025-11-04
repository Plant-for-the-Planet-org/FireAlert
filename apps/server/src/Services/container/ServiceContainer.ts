import type {Context} from '../../Interfaces/Context';
import {SiteService} from '../implementations/SiteService';
import {PermissionService} from '../implementations/PermissionService';
import {TestAlertService} from '../implementations/TestAlertService';
import type {ISiteService} from '../interfaces/ISiteService';
import type {IPermissionService} from '../interfaces/IPermissionService';
import type {ITestAlertService} from '../interfaces/ITestAlertService';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not found in container`);
    }
    return factory();
  }

  // Context-aware service creation
  createSiteService(ctx: Context): ISiteService {
    const permissionService = new PermissionService();
    const testAlertService = new TestAlertService();
    return new SiteService(ctx, permissionService, testAlertService);
  }

  createPermissionService(): IPermissionService {
    return new PermissionService();
  }

  createTestAlertService(): ITestAlertService {
    return new TestAlertService();
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();
