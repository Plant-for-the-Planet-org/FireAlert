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

/**
 * Type guard to check if a method should use SiteAlert-based processing
 */
export function isSiteAlertMethod(method: string): method is SiteAlertMethod {
  return (
    [...NOTIFICATION_ROUTING.SITE_ALERT_METHODS].indexOf(method as any) !== -1
  );
}

/**
 * Type guard to check if a method should use SiteIncident-based processing
 */
export function isSiteIncidentMethod(
  method: string,
): method is SiteIncidentMethod {
  return (
    [...NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS].indexOf(method as any) !==
    -1
  );
}

/**
 * Get all valid notification methods
 */
export function getAllNotificationMethods(): string[] {
  return [
    ...NOTIFICATION_ROUTING.SITE_ALERT_METHODS,
    ...NOTIFICATION_ROUTING.SITE_INCIDENT_METHODS,
  ];
}

/**
 * Check if a method is a valid notification method
 */
export function isValidNotificationMethod(method: string): boolean {
  return getAllNotificationMethods().indexOf(method) !== -1;
}
