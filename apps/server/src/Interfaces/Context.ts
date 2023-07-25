import {InnerTRPCContext} from '../server/api/trpc';

interface ContextToken {
  iss?: string | undefined;
  sub?: string | undefined;
  aud?: string | string[] | undefined;
  exp?: number | undefined;
  nbf?: number | undefined;
  iat?: number | undefined;
  jti?: string | undefined;
  access_token: string;
  'https://app.plant-for-the-planet.org/email'?: string | undefined;
  'https://app.plant-for-the-planet.org/email_verified'?: boolean | undefined;
  azp?: string | undefined;
}

export interface TRPCContext extends InnerTRPCContext {
  token: ContextToken;
}
