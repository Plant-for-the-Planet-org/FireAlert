import moment from 'moment';

export function daysFromToday(inputDate: Date, format = 'MM/DD/YYYY') {
  let eventDate = moment(inputDate, format);
  let today = moment();
  return today.diff(eventDate, 'days');
}
