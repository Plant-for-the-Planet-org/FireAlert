import React from 'react';
import {BaseCard} from './BaseCard';
import Image from 'next/image';
import alertIcon from '../../../public/alertPage/orange-fire-icon.svg';
import {distance, point} from '@turf/turf';
import {twJoin, twMerge} from 'tailwind-merge';

interface AlertData {
  id: string;
  eventDate: Date;
  latitude: number;
  longitude: number;
}

interface IncidentSummaryProps {
  isActive: boolean;
  startAlert: AlertData;
  latestAlert: AlertData;
  allAlerts: AlertData[];
}

function calculateTotalDistance(alerts: AlertData[]): string {
  if (alerts.length < 2) return '0';
  let total = 0;
  for (let i = 0; i < alerts.length - 1; i++) {
    const from = point([alerts[i].longitude, alerts[i].latitude]);
    const to = point([alerts[i + 1].longitude, alerts[i + 1].latitude]);
    const d = distance(from, to, {units: 'kilometers'}) as number;
    total += d;
  }
  return total.toFixed(2);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const CalendarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-planet-dark-gray/60">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-planet-dark-gray/60">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const PinIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-planet-dark-gray/60">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

export function IncidentSummary({
  isActive,
  startAlert,
  latestAlert,
  allAlerts,
}: IncidentSummaryProps) {
  const totalFires = allAlerts.length;
  const totalDistance = calculateTotalDistance(allAlerts);

  return (
    <BaseCard
      className={twMerge(
        'outline-none border-none',
        'flex-col items-start',
        isActive ? 'bg-fire-orange/25' : 'bg-fire-gray/25',
      )}
      iconClassName="w-full flex justify-between items-center"
      icon={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="bg-white w-12 mr-2 flex justify-center items-center aspect-square rounded-full p-1">
              <Image
                src={alertIcon as string}
                alt="Incident Icon"
                className="w-8 h-8"
              />
            </div>
            <span className="text-planet-dark-gray font-semibold font-sans text-lg">
              Incident Summary
            </span>
          </div>
          <div
            className={twJoin(
              'text-white w-4 h-4 rounded-full font-bold shadow-sm',
              isActive ? 'bg-fire-orange' : 'bg-fire-gray',
            )}></div>
        </div>
      }>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
        {/* Started At Section */}
        <div className="flex flex-col">
          <p className="text-planet-dark-gray/60 text-[10px] font-semibold font-sans mb-3 uppercase tracking-wider">
            Started at
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon />
              <span className="text-planet-dark-gray font-sans ">
                {formatDate(startAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon />
              <span className="text-planet-dark-gray font-sans ">
                {formatTime(startAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PinIcon />
              <span className="text-planet-dark-gray font-sans ">
                {startAlert.latitude.toFixed(5)},{' '}
                {startAlert.longitude.toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Ended/Latest At Section */}
        <div className="flex flex-col text-sm">
          <p className="text-planet-dark-gray/60 text-[10px] font-semibold font-sans mb-3 uppercase tracking-wider">
            {isActive ? 'Latest at' : 'Ended at'}
          </p>
          <div className="space-y-2 text">
            <div className="flex items-center gap-2">
              <CalendarIcon />
              <span className="text-planet-dark-gray font-sans ">
                {formatDate(latestAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon />
              <span className="text-planet-dark-gray font-sans ">
                {formatTime(latestAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PinIcon />
              <span className="text-planet-dark-gray font-sans ">
                {latestAlert.latitude.toFixed(5)},{' '}
                {latestAlert.longitude.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-wrap gap-2">
        {/* Total Fires */}
        <div className="flex-1 flex gap-2 flex-wrap bg-white/25 p-3 rounded-2xl">
          <div className="bg-white h-10 mb-2 w-10 flex justify-center items-center aspect-square rounded-full p-1">
            <Image
              src={alertIcon as string}
              alt="Fire Icon"
              className="w-6 h-6"
            />
          </div>
          <div>
            <p className="text-planet-dark-gray/70 text-sm font-sans m-0">
              Total Fires
            </p>
            <p className="text-planet-dark-gray font-bold font-sans m-0">
              {totalFires}
            </p>
          </div>
        </div>

        {/* Total Distance */}
        <div className="flex-1 flex gap-2 flex-wrap bg-white/25 rounded-2xl p-3">
          <div className="bg-fire-orange h-10 mb-2 w-10 flex justify-center items-center aspect-square rounded-full p-1">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <div>
            <p className="text-planet-dark-gray/70 text-sm font-sans m-0">
              Distance
            </p>
            <p className="text-planet-dark-gray font-bold font-sans m-0">
              {totalDistance} kms
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
