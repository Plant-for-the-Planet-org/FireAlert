/**
 * Utility functions for calculating optimal map zoom levels
 * for incidents and alerts in the FireAlert app
 */

import type {FirePoint, IncidentCircleResult} from '../types/incident';

/**
 * Calculates optimal zoom level based on incident radius
 * @param radiusKm - Radius of incident circle in kilometers
 * @returns Optimal zoom level (1-20)
 */
export function calculateZoomFromRadius(radiusKm: number): number {
  // Empirical mapping of radius to zoom levels
  // Larger incidents need lower zoom (wider view)
  // Smaller incidents need higher zoom (closer view)
  
  if (radiusKm <= 0.5) return 15;      // Very small incident
  if (radiusKm <= 1) return 14;       // Small incident
  if (radiusKm <= 2) return 13;       // Medium-small incident
  if (radiusKm <= 5) return 12;       // Medium incident
  if (radiusKm <= 10) return 11;      // Medium-large incident
  if (radiusKm <= 20) return 10;      // Large incident
  if (radiusKm <= 50) return 9;       // Very large incident
  return 8;                          // Extremely large incident
}

/**
 * Calculates optimal zoom level for individual alerts
 * @param alertType - Type of alert detection (optional)
 * @param confidence - Alert confidence level (optional)
 * @returns Optimal zoom level for alert details
 */
export function calculateAlertZoom(alertType?: string, confidence?: string): number {
  // Base zoom for alerts is higher than incidents (closer view)
  let baseZoom = 15;
  
  // Adjust zoom based on confidence level
  if (confidence === 'high') {
    baseZoom = 16;  // Closer view for high confidence
  } else if (confidence === 'low') {
    baseZoom = 14;  // Wider view for low confidence
  }
  
  // Adjust zoom based on detection method if needed
  if (alertType) {
    // Could add type-specific zoom logic here
    // For now, keep the base zoom
  }
  
  return baseZoom;
}

/**
 * Calculates camera settings for optimal incident viewing
 * @param incidentData - Incident data with alerts
 * @param paddingKm - Additional padding for boundary calculation
 * @returns Camera settings object or null if calculation fails
 */
export function calculateIncidentCamera(
  alerts: any[], 
  paddingKm: number = 2
): {
  centerCoordinate: [number, number];
  zoomLevel: number;
  bounds?: [[number, number], [number, number]];
} | null {
  if (!alerts || alerts.length === 0) {
    console.warn('[mapZoom] No alerts provided for incident camera calculation');
    return null;
  }

  try {
    // Convert alerts to FirePoint format
    const firePoints: FirePoint[] = alerts.map(alert => ({
      latitude: alert.latitude,
      longitude: alert.longitude,
    }));

    // Calculate bounds from fire points
    const lats = firePoints.map(p => p.latitude);
    const lngs = firePoints.map(p => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate rough radius (simplified)
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const radiusKm = Math.max(latDiff * 111, lngDiff * 111) / 2 + paddingKm;
    
    // Calculate optimal zoom
    const zoomLevel = calculateZoomFromRadius(radiusKm);
    
    console.log(
      `[mapZoom] Incident camera calculated - center: [${centerLng}, ${centerLat}], zoom: ${zoomLevel}, radius: ${radiusKm.toFixed(2)}km`
    );

    return {
      centerCoordinate: [centerLng, centerLat],
      zoomLevel,
      bounds: [[minLng, minLat], [maxLng, maxLat]],
    };
  } catch (error) {
    console.error('[mapZoom] Error calculating incident camera:', error);
    return null;
  }
}

/**
 * Calculates camera settings for individual alert viewing
 * @param alert - Alert data with coordinates
 * @param alertType - Type of alert (optional)
 * @param confidence - Alert confidence (optional)
 * @returns Camera settings object
 */
export function calculateAlertCamera(
  alert: any,
  alertType?: string,
  confidence?: string
): {
  centerCoordinate: [number, number];
  zoomLevel: number;
} {
  const zoomLevel = calculateAlertZoom(alertType, confidence);
  
  console.log(
    `[mapZoom] Alert camera calculated - center: [${alert.longitude}, ${alert.latitude}], zoom: ${zoomLevel}`
  );

  return {
    centerCoordinate: [alert.longitude, alert.latitude],
    zoomLevel,
  };
}

/**
 * Determines if two camera positions are significantly different
 * @param camera1 - First camera position
 * @param camera2 - Second camera position
 * @param tolerance - Distance tolerance in kilometers (default: 0.1km)
 * @returns True if cameras are significantly different
 */
export function areCamerasDifferent(
  camera1: {centerCoordinate: [number, number]; zoomLevel: number},
  camera2: {centerCoordinate: [number, number]; zoomLevel: number},
  tolerance: number = 0.1
): boolean {
  // Check zoom level difference
  if (Math.abs(camera1.zoomLevel - camera2.zoomLevel) > 0.5) {
    return true;
  }
  
  // Check center coordinate difference (rough approximation)
  const latDiff = Math.abs(camera1.centerCoordinate[1] - camera2.centerCoordinate[1]);
  const lngDiff = Math.abs(camera1.centerCoordinate[0] - camera2.centerCoordinate[0]);
  const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough conversion
  
  return distanceKm > tolerance;
}
