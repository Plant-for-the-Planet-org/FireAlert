i;
/**
 * Custom hook for managing incident circle rendering on the map
 * Fetches incident data and generates circle geometry for visualization
 */

import {useState, useCallback, useEffect} from 'react';
import {useIncidentData} from '../../../hooks/incident/useIncidentData';
import {generateIncidentCircle} from '../../../utils/incident/incidentCircleUtils';
import type {IncidentCircleResult} from '../../../types/incident';
import type {UseHomeIncidentCircleReturn} from '../types';

/**
 * Hook to manage incident circle data and generation
 * Fetches incident data by ID and generates circle geometry for map rendering
 *
 * @returns Object containing incident circle data, generate function, and clear function
 *
 * @example
 * const {incidentCircleData, generateCircle, clearCircle} = useHomeIncidentCircle();
 *
 * // Generate circle when route param is present
 * useEffect(() => {
 *   if (route.params?.siteIncidentId) {
 *     generateCircle(route.params.siteIncidentId);
 *   }
 * }, [route.params?.siteIncidentId]);
 *
 * // Render circle on map
 * {incidentCircleData && (
 *   <MapboxGL.ShapeSource
 *     id="incident-circle"
 *     shape={incidentCircleData.circlePolygon}
 *   >
 *     <MapboxGL.FillLayer id="incident-circle-fill" style={...} />
 *   </MapboxGL.ShapeSource>
 * )}
 */
export function useHomeIncidentCircle(): UseHomeIncidentCircleReturn {
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(
    null,
  );
  const [incidentCircleData, setIncidentCircleData] =
    useState<IncidentCircleResult | null>(null);

  // Fetch incident data using the existing hook
  const {incident, isLoading, isError} = useIncidentData({
    incidentId: currentIncidentId,
    enabled: !!currentIncidentId,
  });

  /**
   * Generates circle geometry from incident data
   * Fetches incident by ID and calculates encompassing circle
   *
   * @param siteIncidentId - The UUID of the site incident to visualize
   */
  const generateCircle = useCallback(async (siteIncidentId: string) => {
    console.log(
      `[incident] useHomeIncidentCircle: Generating circle for incidentId: ${siteIncidentId}`,
    );

    // Set the incident ID to trigger data fetch
    setCurrentIncidentId(siteIncidentId);
  }, []);

  /**
   * Clears the incident circle data and resets state
   */
  const clearCircle = useCallback(() => {
    console.log('[incident] useHomeIncidentCircle: Clearing circle data');
    setCurrentIncidentId(null);
    setIncidentCircleData(null);
  }, []);

  // Generate circle geometry when incident data is loaded
  useEffect(() => {
    if (incident && !isLoading && !isError) {
      console.log(
        `[incident] useHomeIncidentCircle: Incident data loaded - incidentId: ${
          incident.id
        }, alertCount: ${incident.siteAlerts?.length || 0}`,
      );

      // Extract fire points from site alerts
      const firePoints = incident.siteAlerts.map(alert => ({
        latitude: alert.latitude,
        longitude: alert.longitude,
      }));

      // Generate circle geometry using utility function
      const circleResult = generateIncidentCircle(firePoints, 2);

      if (circleResult) {
        console.log(
          `[incident] useHomeIncidentCircle: Circle generated - radiusKm: ${circleResult.radiusKm.toFixed(
            2,
          )}, areaKm2: ${circleResult.areaKm2.toFixed(2)}`,
        );
        setIncidentCircleData(circleResult);
      } else {
        console.warn(
          '[incident] useHomeIncidentCircle: Failed to generate circle geometry',
        );
        setIncidentCircleData(null);
      }
    } else if (isError) {
      console.error(
        `[incident] useHomeIncidentCircle: Error loading incident data for incidentId: ${currentIncidentId}`,
      );
      setIncidentCircleData(null);
    }
  }, [incident, isLoading, isError, currentIncidentId]);

  return {
    incidentCircleData,
    generateCircle,
    clearCircle,
  };
}
