import {find} from 'geo-tz';
export function currentDate(date = new Date(), milliseconds = false) {
  // milliseconds is true for site, is false for project
  const formattedDate = date
    .toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');
  if (milliseconds) {
    const formattedDateWithMilliseconds =
      formattedDate + '.' + ('00000' + date.getMilliseconds()).slice(-6);
    return formattedDateWithMilliseconds;
  }
  return formattedDate;
}

export function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(date.getDate() - days);
  return copy;
}

// This function takes a date in UTC and coordinates (lat,long) and converts the UTC datetime to local time
// It returns local time in the format YYYY-MM-DD HH:MM:SS and local timezone code.

export function getLocalTime(date: Date, latitude: string, longitude: string) {
  const parsedLat = parseFloat(latitude);
  const parsedLong = parseFloat(longitude);
  const timeZone = find(parsedLat, parsedLong)[0];

  const utcDate = new Date(date.toISOString());
  const localDate = new Date(
    utcDate.getTime() + utcDate.getTimezoneOffset() * 60000,
  );

  //The getTimezoneOffset method returns the time-zone offset in minutes. However, the Date object in JavaScript works with milliseconds, not minutes.
  // To convert the timezone offset from minutes to milliseconds (which can then be used with Date), you need to multiply the offset by 60000, because there are 60000 milliseconds in a minute (60 seconds per minute * 1000 milliseconds per second = 60000 milliseconds).

  const localTime = {
    timeZone: timeZone,
    localDate: localDate,
  };

  return localTime;
}
