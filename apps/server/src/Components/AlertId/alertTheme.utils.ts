/**
 * Theme configuration for alert cards based on fire age
 */
export type AlertTheme = 'orange' | 'brown' | 'gray' ;

export interface AlertThemeConfig {
  theme: AlertTheme;
  iconPath: string;
  backgroundColor: string;
  textColor: string;
}

/**
 * Determines the theme for an alert based on how many days old it is
 * @param days - Number of days since the fire was detected
 * @returns Theme configuration object
 */
export function getAlertTheme(days: number): AlertThemeConfig {
  switch (true) {
    case days === 0:
      return {
        theme: 'orange',
        iconPath: '/alertPage/orange-fire-icon.svg',
        backgroundColor: '#E86F561A',
        textColor: '#E86F56',
      };
    case days > 0 && days <= 3:
      return {
        theme: 'brown',
        iconPath: '/alertPage/brown-fire-icon.svg',
        backgroundColor: '#B47C551A',
        textColor: '#B47C55',
      };
    case days > 3:
      return {
        theme: 'gray',
        iconPath: '/alertPage/gray-fire-icon.svg',
        backgroundColor: '#C6C3C21A',
        textColor: '#C6C3C2',
      };
    default:
      // Fallback to orange for unknown cases
      return {
        theme: 'orange',
        iconPath: '/alertPage/orange-fire-icon.svg',
        backgroundColor: '#E86F561A',
        textColor: '#E86F56',
      };
  }
}

/**
 * Calculates the number of days since a given date
 * @param date - The date to calculate days from
 * @returns Number of days since the date
 */
export function getDaysSince(date: Date): number {
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const timeDiff = now.getTime() - date.getTime();
  return Math.floor(timeDiff / millisecondsPerDay);
}

