import type {TRPCContext} from './Context';
import type {AlertMethod} from '@prisma/client';

export enum AlertMethodMethod {
  email = 'email',
  sms = 'sms',
  device = 'device',
  whatsapp = 'whatsapp',
  webhook = 'webhook',
}

// Use this TypeScript enum in code like this:
// let method: AlertMethodMethod = AlertMethodMethod.email;

export type CheckUserHasAlertMethodPermissionArgs = {
  ctx: TRPCContext; // the TRPC context object
  alertMethodId: string; // the ID of the site to be updated
  userId: string; // the ID of the user attempting to update the site
};

export type CtxWithAlertMethod = {
  ctx: TRPCContext;
  alertMethod: AlertMethod;
};

export type CtxWithAlertMethodId = {
  ctx: TRPCContext;
  alertMethodId: string;
};

export type LimitAlertMethods = {
  ctx: TRPCContext;
  userId: string;
  count: number;
};

export type LimitSpecificAlertMethods = {
  ctx: TRPCContext;
  userId: string;
  count: number;
  method: string;
};

export type UserPlan = 'basic' | 'custom';

export type LimitAlertMethodBasedOnPlanProps = {
  ctx: TRPCContext;
  userId: string;
  userPlan: UserPlan;
  method: string;
};
