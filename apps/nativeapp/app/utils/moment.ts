import moment from 'moment';

export function daysFromToday(inputDate: Date) {
  let eventDate = moment(inputDate);
  let today = moment();
  return today.diff(eventDate, 'days');
}
