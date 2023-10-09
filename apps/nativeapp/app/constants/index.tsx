import {WEB_URLS} from './webUrls';

const RADIUS_ARR = [
  {name: 'Within 100 km', value: 100000},
  {name: 'Within 10 km', value: 10000},
  {name: 'Within 5 km', value: 5000},
  {name: 'Within 1 km', value: 1000},
  {name: 'Inside', value: 0},
];

const POINT_RADIUS_ARR = [
  {name: 'Within 100 km', value: 100000},
  {name: 'Within 10 km', value: 10000},
  {name: 'Within 5 km', value: 5000},
  {name: 'Within 1 km', value: 1000},
];

// Excluded countries for sms type alert methods
const EXCLUDED_COUNTRIES = [
  'RU',
  'TJ',
  'MG',
  'ID',
  'PK',
  'AZ',
  'PS',
  'LY',
  'UZ',
  'AF',
  'BZ',
];

export {WEB_URLS, RADIUS_ARR, POINT_RADIUS_ARR, EXCLUDED_COUNTRIES};
