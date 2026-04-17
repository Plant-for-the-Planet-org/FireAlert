import React from 'react';
import {BaseCard} from './BaseCard';
import Image from 'next/image';
import orangeAlertIcon from '../../../public/incidentPage/orange-fire-icon.svg';
import blackAlertIcon from '../../../public/incidentPage/black-fire-icon.svg';
import {calculateIncidentArea} from './incidentBoundaryUtils';
import {twJoin, twMerge} from 'tailwind-merge';
import tzlookup from '@photostructure/tz-lookup';

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
  combinedAlerts?: AlertData[];
  showCombinedSummary?: boolean;
  startedAt?: Date;
  endedAt?: Date;
  latitude?: number;
  longitude?: number;
}

function formatDateTime(
  date: Date,
  latitude?: number,
  longitude?: number,
): {date: string; time: string; offset: string} {
  let dateString = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  let timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  let offsetString = '';

  if (latitude !== undefined && longitude !== undefined) {
    try {
      const timeZone = tzlookup(latitude, longitude);
      const formattedDate = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone,
      });
      const formattedTime = date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
      });
      dateString = formattedDate;
      timeString = formattedTime;

      // Get timezone offset
      const offset = date.toLocaleString('en-GB', {
        timeZone,
        timeZoneName: 'shortOffset',
      });
      const offsetMatch = offset.match(/GMT[+-]\d{1,2}/);
      offsetString = offsetMatch ? offsetMatch[0] : '';
    } catch (error) {
      // Fallback to original format if tz-lookup fails
      console.error('Error calculating timezone:', error);
    }
  }

  return {date: dateString, time: timeString, offset: offsetString};
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

export function IncidentSummary({
  isActive,
  startAlert,
  latestAlert,
  allAlerts,
  combinedAlerts,
  showCombinedSummary = false,
  startedAt,
  endedAt,
  latitude,
  longitude,
}: IncidentSummaryProps) {
  const totalFires = allAlerts.length;

  // Prioritize SiteIncident dates over SiteAlert dates
  const startDate = startedAt || startAlert.eventDate;
  const endDate = endedAt || latestAlert.eventDate;
  const areaAffected = calculateIncidentArea(
    allAlerts.map(a => ({latitude: a.latitude, longitude: a.longitude})),
    // 2,
  );
  const shouldRenderCombinedSummary =
    showCombinedSummary &&
    Array.isArray(combinedAlerts) &&
    combinedAlerts.length > 0;
  const combinedFires = combinedAlerts || [];
  const combinedAreaAffected = shouldRenderCombinedSummary
    ? calculateIncidentArea(
        combinedFires.map(a => ({
          latitude: a.latitude,
          longitude: a.longitude,
        })),
      )
    : null;

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
                {formatDateTime(startDate, latitude, longitude).date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatDateTime(startDate, latitude, longitude).time}
                {formatDateTime(startDate, latitude, longitude).offset && (
                  <span className="ml-1">
                    ({formatDateTime(startDate, latitude, longitude).offset})
                  </span>
                )}
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
                {formatDateTime(endDate, latitude, longitude).date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon isActive={isActive} />
              <span className="text-planet-dark-gray font-sans ">
                {formatDateTime(endDate, latitude, longitude).time}
                {formatDateTime(endDate, latitude, longitude).offset && (
                  <span className="ml-1">
                    ({formatDateTime(endDate, latitude, longitude).offset})
                  </span>
                )}
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
              {areaAffected}
            </p>
          </div>
        </div>
      </div>

      {shouldRenderCombinedSummary && combinedAreaAffected && (
        <div className="w-full mt-4 pt-4 border-t border-white/50">
          <p className="text-planet-dark-gray/70 pl-4 text-xs font-semibold font-sans mt-0 mb-2">
            For Combined Incidents
          </p>
          <div className="w-full flex flex-wrap gap-2">
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
                  Combined Fires
                </p>
                <p className="text-planet-dark-gray font-bold font-sans m-0">
                  {combinedFires.length}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-wrap gap-2 bg-white/25 rounded-2xl p-4">
              <div className="bg-transparent h-4 w-4 mb-2 flex justify-start items-center aspect-square rounded-full">
                <IncidentAreaIcon isActive={isActive} />
              </div>
              <div>
                <p className="text-planet-dark-gray/70 text-sm font-sans m-0">
                  Combined Area
                </p>
                <p className="text-planet-dark-gray font-bold font-sans m-0">
                  {combinedAreaAffected}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseCard>
  );
}
