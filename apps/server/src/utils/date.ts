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
