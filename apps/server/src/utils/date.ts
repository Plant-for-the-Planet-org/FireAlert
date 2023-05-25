export function currentDate(date = new Date(), milliseconds = false) {
  // milliseconds is true for site, is false for project
  const formattedDate = date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  if (milliseconds) {
    const formattedDateWithMilliseconds = formattedDate + '.' + ('00000' + date.getMilliseconds()).slice(-6);
    return formattedDateWithMilliseconds;
  }
  return formattedDate;
}

export function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(date.getDate() - days);
  return copy;
}

export function isGreaterThanCurrentDateTime(date: Date, minutes: number): boolean {
  // Create a new date by adding minutes to the input date
  const futureDate = new Date(date.getTime() + minutes * 60000); // Convert minutes to milliseconds

  // Get the current date and time
  const currentDate = new Date();

  // Compare the future date with the current date
  if (futureDate > currentDate) {
    return true;
  } else {
    return false;
  }
}