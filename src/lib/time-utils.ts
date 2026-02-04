import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';

/**
 * Formats a 24-hour time string (HH:mm or HH:mm:ss) to 12-hour format (e.g., "2:00 PM")
 */
export function formatTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Formats a time range in 12-hour format (e.g., "10:00 AM – 12:00 PM")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTo12Hour(startTime)} – ${formatTo12Hour(endTime)}`;
}

/**
 * Gets current time in America/Toronto timezone
 */
export function getNowInToronto(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Checks if a sprint is closed (has started or is past)
 */
export function isSprintClosed(sprintDate: string, startTime: string): boolean {
  const now = new Date();
  const sprintStart = new Date(`${sprintDate}T${startTime}`);
  // Consider sprint closed 5 minutes after start
  const closedAfter = new Date(sprintStart.getTime() + 5 * 60 * 1000);
  return now >= closedAfter;
}

/**
 * Checks if the sprint start is within a certain number of minutes
 */
export function isWithinMinutesOfStart(sprintDate: string, startTime: string, minutes: number): boolean {
  const now = new Date();
  const sprintStart = new Date(`${sprintDate}T${startTime}`);
  const diffMs = sprintStart.getTime() - now.getTime();
  const diffMins = diffMs / (1000 * 60);
  return diffMins <= minutes && diffMins >= 0;
}

export { TIMEZONE };
