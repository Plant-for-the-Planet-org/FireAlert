/**
 * Version Validation Middleware for tRPC
 *
 * This middleware enforces version compatibility on API requests by:
 * 1. Extracting client version and platform from request headers
 * 2. Checking if the endpoint is in the bypass list
 * 3. Handling missing version during grace period
 * 4. Validating client version against compatibility matrix
 * 5. Adding version context to tRPC context
 * 6. Logging all version check results
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 12.1, 12.2
 */

import {TRPCError} from '@trpc/server';
import {loadVersionMetadata} from '../../../utils/version/metadataLoader';
import {evaluateCompatibility} from '../../../utils/version/compatibility';
import {VERSION_CONFIG} from '../../../config/version';
import {logger} from '../../logger';
import type {Platform} from '../../../utils/version/schema';

/**
 * Version context added to tRPC context
 */
export interface VersionContext {
  /** Client version from header (if provided) */
  clientVersion?: string;
  /** Client platform from header (if provided) */
  platform?: Platform;
  /** Whether the client version is compatible with API version */
  isCompatible: boolean;
  /** Whether version validation was bypassed for this endpoint */
  bypassEnabled: boolean;
  /** Whether grace period is currently active */
  gracePeriodActive: boolean;
}

/**
 * Extract the procedure name from the tRPC path
 * @param path - Full tRPC path (e.g., "site.getSites" or "version.check")
 * @returns Procedure identifier for bypass checking
 */
function extractProcedureName(path: string): string {
  // Return the full path as the procedure name for bypass checking
  return path;
}

/**
 * Version validation middleware
 *
 * This middleware is applied to all tRPC procedures and validates that the client
 * version is compatible with the current API version. It supports:
 * - Bypass list for specific endpoints (e.g., version.check, health)
 * - Grace period for smooth rollout (allows missing version with warning)
 * - Development bypass mode via BYPASS_VERSION_CHECK environment variable
 * - Compatibility matrix evaluation
 * - Detailed logging for monitoring
 *
 * @throws {TRPCError} BAD_REQUEST if version header is missing (outside grace period)
 * @throws {TRPCError} PRECONDITION_FAILED if client version is incompatible
 */
export const versionMiddleware = async ({ctx, next, path}: any) => {
  const metadata = loadVersionMetadata();
  const apiVersion = VERSION_CONFIG.API_VERSION;

  // Extract procedure name for bypass checking
  const procedureName = extractProcedureName(path);

  // Check if version check bypass is enabled via environment variable
  const bypassVersionCheck = process.env.BYPASS_VERSION_CHECK === 'true';
  if (bypassVersionCheck) {
    logger(
      `Version check bypassed via BYPASS_VERSION_CHECK environment variable for endpoint: ${procedureName}`,
      'warn',
    );

    return next({
      ctx: {
        ...ctx,
        version: {
          bypassEnabled: true,
          isCompatible: true,
          gracePeriodActive: metadata.gracePeriod.enabled,
        } as VersionContext,
      },
    });
  }

  // Check if endpoint bypasses version validation
  if (metadata.bypassEndpoints.includes(procedureName)) {
    logger(`Version check bypassed for endpoint: ${procedureName}`, 'info');

    return next({
      ctx: {
        ...ctx,
        version: {
          bypassEnabled: true,
          isCompatible: true,
          gracePeriodActive: metadata.gracePeriod.enabled,
        } as VersionContext,
      },
    });
  }

  // Extract version headers
  const clientVersion = ctx.req.headers['x-client-version'] as
    | string
    | undefined;
  const platform = ctx.req.headers['x-client-platform'] as Platform | undefined;

  // Handle missing version during grace period
  if (!clientVersion) {
    if (metadata.gracePeriod.enabled) {
      logger(
        'Version check bypassed during grace period (no client version)',
        'warn',
      );

      return next({
        ctx: {
          ...ctx,
          version: {
            bypassEnabled: false,
            isCompatible: true,
            gracePeriodActive: true,
          } as VersionContext,
        },
      });
    }

    // Grace period not active, version header is required
    logger(
      `Missing client version header for endpoint: ${procedureName}`,
      'error',
    );

    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client version header is required',
    });
  }

  // Validate version compatibility
  const compatibility = evaluateCompatibility(
    clientVersion,
    apiVersion,
    platform || 'web', // Default to web if platform not specified
    metadata.compatibilityMatrix,
  );

  // Log version check result
  logger(
    `Version check: client=${clientVersion}, api=${apiVersion}, platform=${
      platform || 'web'
    }, compatible=${compatibility.isCompatible}, reason=${
      compatibility.reason
    }`,
    compatibility.isCompatible ? 'info' : 'warn',
  );

  // If incompatible, throw error
  if (!compatibility.isCompatible) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Client version is not compatible with API version',
      cause: {
        clientVersion,
        apiVersion,
        minimumVersion: platform
          ? metadata.minimumVersions[platform]
          : undefined,
        reason: compatibility.reason,
      },
    });
  }

  // Version is compatible, continue with request
  return next({
    ctx: {
      ...ctx,
      version: {
        clientVersion,
        platform,
        isCompatible: true,
        bypassEnabled: false,
        gracePeriodActive: metadata.gracePeriod.enabled,
      } as VersionContext,
    },
  });
};
