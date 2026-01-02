/**
 * Duration option configuration
 */
export interface DurationOption {
  value: number;
  label: string;
  displayValue: string; // For select option display
}

/**
 * Duration options for filtering alerts
 */
export const DURATION_OPTIONS: DurationOption[] = [
  { value: 0, label: 'Today', displayValue: '0' },
  { value: 3, label: 'Last 3 Days', displayValue: '3' },
  { value: 7, label: 'Last 7 Days', displayValue: '7' },
  { value: 30, label: 'Last 30 Days', displayValue: '30' },
  { value: 90, label: 'Last 90 Days', displayValue: '90' },
];

/**
 * Default duration option (Last 7 Days)
 */
export const DEFAULT_DURATION = 7;

/**
 * Gets the duration option by value
 */
export function getDurationOption(value: number): DurationOption | undefined {
  return DURATION_OPTIONS.find(option => option.value === value);
}

/**
 * Calculates the start date for filtering alerts based on duration
 * For "Today" (value: 0), returns start of today
 * For other values, returns duration days ago
 */
export function getStartDateForDuration(durationInDays: number): Date {
  const now = new Date();
  
  if (durationInDays === 0) {
    // For "Today", return start of today (midnight)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday;
  }
  
  // For other durations, calculate days ago
  return new Date(now.getTime() - durationInDays * 24 * 60 * 60 * 1000);
}

