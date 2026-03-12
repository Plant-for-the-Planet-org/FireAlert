/**
 * Configuration for method-based notification routing
 *
 * This configuration defines which AlertMethod methods should be processed
 * by SiteAlert-based (real-time) vs SiteIncident-based (aggregated) services.
 */

export const NOTIFICATION_ROUTING = {
  // Real-time methods: Send per SiteAlert (immediate notifications)
  SITE_ALERT_METHODS: ['device', 'webhook'] as const,

  // Aggregated methods: Send per SiteIncident boundaries (rate-limited)
  SITE_INCIDENT_METHODS: ['email', 'sms', 'whatsapp'] as const,
} as const;

export type SiteAlertMethod =
  (typeof NOTIFICATION_ROUTING.SITE_ALERT_METHODS)[number];

export type SiteIncidentMethod =
  (typeof NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS)[number];

const SITE_ALERT_METHODS_SET = new Set<string>(
  NOTIFICATION_ROUTING.SITE_ALERT_METHODS,
);
const SITE_INCIDENT_METHODS_SET = new Set<string>(
  NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS,
);

/**
 * Type guard to check if a method should use SiteAlert-based processing
 */
export function isSiteAlertMethod(method: string): method is SiteAlertMethod {
  return SITE_ALERT_METHODS_SET.has(method);
}

/**
 * Type guard to check if a method should use SiteIncident-based processing
 */
export function isSiteIncidentMethod(
  method: string,
): method is SiteIncidentMethod {
  return SITE_INCIDENT_METHODS_SET.has(method);
}
