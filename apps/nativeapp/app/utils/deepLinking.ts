/**
 * Deep linking utilities for FireAlert app
 * Handles URL parsing and external state initialization for incidents and alerts
 */

import {Config} from '../../config';
import type {CameraPosition} from '../redux/slices/details/detailsUISlice';

/**
 * Deep link types supported by the app
 */
export type DeepLinkType = 'incident' | 'alert' | 'unknown';

/**
 * Parsed deep link information
 */
export interface ParsedDeepLink {
  type: DeepLinkType;
  id: string;
  params?: Record<string, string>;
  originalUrl: string;
}

/**
 * Camera position from deep link parameters
 */
export interface DeepLinkCamera {
  centerCoordinate: [number, number];
  zoomLevel: number;
}

/**
 * Validates if a string is a valid UUID or CUID
 * @param id - String to validate
 * @returns True if valid UUID or CUID format
 */
export function isValidUUID(id: string): boolean {
  // Check for standard UUID v4 format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return true;
  }

  // Check for CUID format (commonly used in databases)
  const cuidRegex = /^[a-z0-9]{24}$/i;
  if (cuidRegex.test(id)) {
    return true;
  }

  return false;
}

/**
 * Parses a deep link URL and extracts incident/alert information
 * @param url - Deep link URL to parse
 * @returns Parsed deep link information or null if invalid
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url || typeof url !== 'string') {
    console.warn('[deepLinking] Invalid URL provided');
    return null;
  }

  try {
    // Handle different URL formats
    let cleanUrl = url;

    // Remove firealert:// protocol if present
    if (url.startsWith('firealert://')) {
      cleanUrl = url.replace('firealert://', '');
    }

    // Remove production web URL if present
    if (Config.APP_URL && url.includes(Config.APP_URL)) {
      cleanUrl = url.split(Config.APP_URL)[1];
    }

    // Remove https://firealert.app/ if present (fallback)
    if (url.includes('firealert.app/')) {
      cleanUrl = url.split('firealert.app/')[1];
    }

    // Parse path and parameters
    const [pathPart, ...paramParts] = cleanUrl.split('/');
    const path = pathPart.toLowerCase();

    // Parse query parameters
    let params: Record<string, string> = {};
    const queryString = paramParts.join('/');
    if (queryString.includes('?')) {
      const queryPart = queryString.split('?')[1];
      const urlParams = new URLSearchParams(queryPart);
      for (const [key, value] of urlParams) {
        params[key] = value;
      }
    }

    // Extract ID from path or parameters
    let id = '';
    if (queryString.includes('?')) {
      id = queryString.split('?')[0];
    } else {
      id = queryString;
    }

    // Validate ID
    if (!id || !isValidUUID(id)) {
      console.warn('[deepLinking] Invalid ID in deep link:', id);
      return null;
    }

    // Determine type
    let type: DeepLinkType;
    if (path === 'incident' || path === 'incidents') {
      type = 'incident';
    } else if (path === 'alert' || path === 'alerts') {
      type = 'alert';
    } else {
      console.warn('[deepLinking] Unknown deep link type:', path);
      return null;
    }

    console.log('[deepLinking] Parsed deep link:', {
      type,
      id,
      params,
      originalUrl: url,
    });

    return {
      type,
      id,
      params,
      originalUrl: url,
    };
  } catch (error) {
    console.error('[deepLinking] Error parsing deep link:', error);
    return null;
  }
}

/**
 * Extracts camera position from deep link parameters
 * @param params - Deep link parameters
 * @returns Camera position or null if not found
 */
export function extractCameraFromParams(
  params: Record<string, string>,
): DeepLinkCamera | null {
  try {
    const lat = parseFloat(params.lat || params.latitude || '');
    const lng = parseFloat(params.lng || params.longitude || '');
    const zoom = parseFloat(params.zoom || params.zoomLevel || '');

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.warn('[deepLinking] Invalid coordinates in params:', {lat, lng});
      return null;
    }

    const zoomLevel = isNaN(zoom) ? 12 : Math.max(1, Math.min(20, zoom));

    console.log('[deepLinking] Extracted camera from params:', {
      lat,
      lng,
      zoomLevel,
    });

    return {
      centerCoordinate: [lng, lat],
      zoomLevel,
    };
  } catch (error) {
    console.error('[deepLinking] Error extracting camera from params:', error);
    return null;
  }
}

/**
 * Validates deep link parameters
 * @param parsedLink - Parsed deep link information
 * @returns True if deep link is valid and safe to process
 */
export function validateDeepLink(parsedLink: ParsedDeepLink): boolean {
  if (!parsedLink || !parsedLink.id || !parsedLink.type) {
    return false;
  }

  // Validate UUID
  if (!isValidUUID(parsedLink.id)) {
    return false;
  }

  // Validate type
  if (!['incident', 'alert'].includes(parsedLink.type)) {
    return false;
  }

  // Validate camera parameters if present
  if (parsedLink.params) {
    const camera = extractCameraFromParams(parsedLink.params);
    if ((camera && camera.zoomLevel < 1) || camera.zoomLevel > 20) {
      console.warn('[deepLinking] Invalid zoom level in deep link');
      return false;
    }
  }

  return true;
}

/**
 * Creates a deep link URL for an incident
 * @param incidentId - Incident ID
 * @param camera - Optional camera position
 * @returns Deep link URL
 */
export function createIncidentDeepLink(
  incidentId: string,
  camera?: CameraPosition,
): string {
  if (!isValidUUID(incidentId)) {
    throw new Error('Invalid incident ID');
  }

  const baseUrl =
    Config.APP_URL || 'https://firealert.plant-for-the-planet.org';
  let url = `${baseUrl}/incident/${incidentId}`;

  if (camera) {
    const params = new URLSearchParams({
      lat: camera.centerCoordinate[1].toString(),
      lng: camera.centerCoordinate[0].toString(),
      zoom: camera.zoomLevel.toString(),
    });
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * Creates a deep link URL for an alert
 * @param alertId - Alert ID
 * @param camera - Optional camera position
 * @returns Deep link URL
 */
export function createAlertDeepLink(
  alertId: string,
  camera?: CameraPosition,
): string {
  if (!isValidUUID(alertId)) {
    throw new Error('Invalid alert ID');
  }

  const baseUrl =
    Config.APP_URL || 'https://firealert.plant-for-the-planet.org';
  let url = `${baseUrl}/alert/${alertId}`;

  if (camera) {
    const params = new URLSearchParams({
      lat: camera.centerCoordinate[1].toString(),
      lng: camera.centerCoordinate[0].toString(),
      zoom: camera.zoomLevel.toString(),
    });
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * Determines if a URL is a FireAlert deep link
 * @param url - URL to check
 * @returns True if it's a FireAlert deep link
 */
export function isFireAlertDeepLink(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const appUrl = Config.APP_URL?.replace(/\/$/, ''); // Remove trailing slash

  return (
    url.startsWith('firealert://') ||
    (appUrl && url.includes(`${appUrl}/incident/`)) ||
    (appUrl && url.includes(`${appUrl}/alert/`)) ||
    (appUrl && url.includes(`${appUrl}/incidents/`)) ||
    (appUrl && url.includes(`${appUrl}/alerts/`)) ||
    url.includes('firealert.app/incident/') ||
    url.includes('firealert.app/alert/') ||
    url.includes('firealert.app/incidents/') ||
    url.includes('firealert.app/alerts/')
  );
}

/**
 * Processes a deep link and returns Redux action parameters
 * @param url - Deep link URL
 * @returns Redux action parameters or null if invalid
 */
export function processDeepLink(url: string): {
  type: 'openIncidentDetails' | 'openAlertDetails';
  payload: any;
} | null {
  const parsed = parseDeepLink(url);

  if (!parsed || !validateDeepLink(parsed)) {
    return null;
  }

  const camera = parsed.params ? extractCameraFromParams(parsed.params) : null;

  if (parsed.type === 'incident') {
    return {
      type: 'openIncidentDetails',
      payload: {
        incidentId: parsed.id,
        cameraPosition: camera,
      },
    };
  } else if (parsed.type === 'alert') {
    return {
      type: 'openAlertDetails',
      payload: {
        alertId: parsed.id,
        cameraPosition: camera,
      },
    };
  }

  return null;
}

// Default export with commonly used functions
export const deepLinking = {
  parseDeepLink,
  validateDeepLink,
  createIncidentDeepLink,
  createAlertDeepLink,
  isFireAlertDeepLink,
  processDeepLink,
};
