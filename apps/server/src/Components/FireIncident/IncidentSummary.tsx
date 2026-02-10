import React from 'react';
import {BaseCard} from './BaseCard';
import Image from 'next/image';
import orangeAlertIcon from '../../../public/incidentPage/orange-fire-icon.svg';
import blackAlertIcon from '../../../public/incidentPage/black-fire-icon.svg';
import {calculateIncidentArea} from './incidentCircleUtils';
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const IncidentIcon = ({isActive}: {isActive: boolean}) => (
  <Image
    width={24}
    height={24}
    src={
      isActive
        ? '/incidentPage/incident-active.svg'
        : '/incidentPage/incident-inactive.svg'
    }
    alt="Fire Incident Date"
  />
);

const CalendarIcon = ({isActive}: {isActive: boolean}) => (
  <Image
    width={16}
    height={16}
    src={
      isActive
        ? '/incidentPage/calendar-active.svg'
        : '/incidentPage/calendar-inactive.svg'
    }
    alt="Fire Incident Date"
  />
);

const ClockIcon = ({isActive}: {isActive: boolean}) => (
  <Image
    width={16}
    height={16}
    src={
      isActive
        ? '/incidentPage/clock-active.svg'
        : '/incidentPage/clock-inactive.svg'
    }
    alt="Fire Incident Time"
  />
);

const IncidentAreaIcon = ({isActive}: {isActive: boolean}) => (
  <Image
    width={16}
    height={16}
    src={
      isActive
        ? '/incidentPage/incident-area-active.svg'
        : '/incidentPage/incident-area-inactive.svg'
    }
    alt="Fire Incident Time"
  />
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
  const areaAffected = calculateIncidentArea(
    allAlerts.map(a => ({latitude: a.latitude, longitude: a.longitude})),
    2,
  );

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
            <div className="bg-white w-12 mr-2 flex justify-center items-center aspect-square rounded-full">
              {/* <Image
                src={alertIcon as string}
                alt="Incident Icon"
                className="w-8 h-8"
              /> */}
              <IncidentIcon isActive={isActive} />
            </div>
            <span className="text-planet-dark-gray font-semibold font-sans text-lg">
              Fire Incident Summary
            </span>
          </div>
          <div
            className={twJoin(
              'text-white text-xs p-2 px-4 rounded-lg shadow-sm',
              isActive ? 'bg-fire-orange' : 'bg-planet-dark-gray',
            )}>
            {isActive ? 'Active' : 'Resolved'}
          </div>
        </div>
      }>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
        {/* Started At Section */}
        <div className="flex flex-col pl-4">
          <p className="text-planet-dark-gray/60 text-xs mb-3">Started at</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatDate(startAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatTime(startAlert.eventDate)}
              </span>
            </div>
            {/* <div className="flex items-center gap-2">
              <PinIcon />
              <span className="text-planet-dark-gray font-sans ">
                {startAlert.latitude.toFixed(5)},{' '}
                {startAlert.longitude.toFixed(5)}
              </span>
            </div> */}
          </div>
        </div>

        {/* Ended/Latest At Section */}
        <div className="flex flex-col pl-4 text-sm">
          <p className="text-planet-dark-gray/60 text-xs mb-3">
            {isActive ? 'Latest at' : 'Ended at'}
          </p>
          <div className="space-y-2 text">
            <div className="flex items-center gap-2">
              <CalendarIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatDate(latestAlert.eventDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatTime(latestAlert.eventDate)}
              </span>
            </div>
            {/* <div className="flex items-center gap-2">
              <PinIcon />
              <span className="text-planet-dark-gray font-sans ">
                {latestAlert.latitude.toFixed(5)},{' '}
                {latestAlert.longitude.toFixed(5)}
              </span>
            </div> */}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-wrap gap-2">
        {/* Total Fires */}
        <div className="flex-1 flex flex-wrap gap-2 bg-white/25 p-4 rounded-2xl">
          <div className="bg-transparent h-4 w-4 mb-2 flex justify-start items-center aspect-square rounded-full">
            <Image
              src={(isActive ? orangeAlertIcon : blackAlertIcon) as string}
              alt="Fire Icon"
              className="w-5 h-5"
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

        {/* Total Area */}
        <div className="flex-1 flex flex-wrap gap-2 bg-white/25 rounded-2xl p-4">
          <div className="bg-transparent h-4 w-4 mb-2 flex justify-start items-center aspect-square rounded-full">
            <IncidentAreaIcon isActive={isActive} />
          </div>
          <div>
            <p className="text-planet-dark-gray/70 text-sm font-sans m-0">
              Area Affected
            </p>
            <p className="text-planet-dark-gray font-bold font-sans m-0">
              {areaAffected.toFixed(2)} km²
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
