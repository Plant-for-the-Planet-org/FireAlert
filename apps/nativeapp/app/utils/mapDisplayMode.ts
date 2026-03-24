import moment from 'moment-timezone';
import {generateIncidentCircle} from './incident/incidentCircleUtils';
import type {IncidentCircleResult} from '../types/incident';

/**
 * Interface for alert data structure
 */
export interface AlertData {
  id: string;
  latitude: number;
  longitude: number;
  eventDate: string;
  siteIncidentId?: string | null;
  site?: {
    id: string;
    name?: string;
  };
}

/**
 * Interface for composed incident data
 */
export interface ComposedIncident {
  incidentId: string;
  siteId: string;
  alertCount: number;
  alerts: AlertData[];
  circle: IncidentCircleResult | null;
}

/**
 * Composes incidents from filtered alerts by grouping alerts with the same siteIncidentId
 * and calculating incident circles. Limits results to N=60 incidents.
 *
 * @param alerts - Array of alert data filtered by duration
 * @returns Array of composed incidents with calculated circles
 */
export function composeIncidents(alerts: AlertData[]): ComposedIncident[] {
  if (!alerts || alerts.length === 0) {
    return [];
  }

  const incidentMap = new Map<string, Omit<ComposedIncident, 'circle'>>();

  // Group alerts by siteIncidentId
  alerts.forEach(alert => {
    if (alert.siteIncidentId) {
      if (!incidentMap.has(alert.siteIncidentId)) {
        incidentMap.set(alert.siteIncidentId, {
          incidentId: alert.siteIncidentId,
          siteId: alert.site?.id || '',
          alertCount: 0,
          alerts: [],
        });
      }
      const incident = incidentMap.get(alert.siteIncidentId)!;
      incident.alerts.push(alert);
      incident.alertCount = incident.alerts.length;
    }
  });

  // Calculate circles for each incident (limit to N=60)
  const composedIncidents: ComposedIncident[] = [];
  let count = 0;

  for (const [_incidentId, incident] of incidentMap.entries()) {
    if (count >= 60) {
      break;
    }

    const firePoints = incident.alerts.map(a => ({
      latitude: a.latitude,
      longitude: a.longitude,
    }));

    const circle = generateIncidentCircle(firePoints, 0.5);

    composedIncidents.push({
      ...incident,
      circle,
    });

    count++;
  }

  return composedIncidents;
}

/**
 * Filters alerts by duration window
 *
 * @param alerts - Array of all alerts
 * @param durationDays - Number of days to filter by
 * @returns Filtered array of alerts within the duration window
 */
export function filterAlertsByDuration(
  alerts: AlertData[],
  durationDays: number,
): AlertData[] {
  if (!alerts || alerts.length === 0) {
    return [];
  }

  if (durationDays <= 0) {
    return [];
  }

  const cutoffDate = moment().subtract(durationDays, 'days');

  return alerts.filter(alert => moment(alert.eventDate).isAfter(cutoffDate));
}
