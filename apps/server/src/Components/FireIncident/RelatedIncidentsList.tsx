import React from 'react';
import {BaseCard} from './BaseCard';
import {twMerge} from 'tailwind-merge';
import tzlookup from '@photostructure/tz-lookup';

interface RelatedIncidentListItem {
  id: string;
  isActive: boolean;
  startedAt: Date;
  latestAt: Date;
  fireCount: number;
  latitude?: number;
  longitude?: number;
}

interface RelatedIncidentsListProps {
  incidents: RelatedIncidentListItem[];
  activeIncidentId?: string | null;
  onIncidentHoverChange?: (incidentId: string | null) => void;
  onIncidentFocusChange?: (incidentId: string | null) => void;
}

function formatDateTime(
  date: Date,
  latitude?: number,
  longitude?: number,
): string {
  if (latitude !== undefined && longitude !== undefined) {
    try {
      const timeZone = tzlookup(latitude, longitude);
      const formattedDate = date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
      });
      // Get timezone offset
      const offset = date.toLocaleString('en-GB', {
        timeZone,
        timeZoneName: 'shortOffset',
      });
      const offsetMatch = offset.match(/GMT[+-]\d{1,2}/);
      const offsetString = offsetMatch ? offsetMatch[0] : '';
      return offsetString
        ? `${formattedDate} (${offsetString})`
        : formattedDate;
    } catch (error) {
      // Fallback to original format if tz-lookup fails
      console.error('Error calculating timezone:', error);
    }
  }
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function RelatedIncidentsList({
  incidents,
  activeIncidentId,
  onIncidentHoverChange,
  onIncidentFocusChange,
}: RelatedIncidentsListProps) {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <BaseCard
      className="outline outline-gray-card-border flex-col items-start gap-3"
      contentClassName="gap-3">
      <div className="w-full">
        <p className="text-[10px] font-sans font-semibold text-planet-dark-gray/50 uppercase my-0">
          Related Site Incidents
        </p>
        <p className="text-sm font-semibold text-planet-dark-gray my-1">
          Connected incidents ({incidents.length})
        </p>
      </div>

      {incidents.map(incident => {
        const isHovering = incident.id === activeIncidentId;
        return (
          <button
            key={incident.id}
            type="button"
            className={twMerge(
              'w-full rounded-lg p-3 text-left',
              'border-none ring-0 hover:ring-1',
              isHovering
                ? incident.isActive
                  ? 'ring-fire-orange'
                  : 'ring-gray-card-border'
                : 'ring-gray-card-border',
            )}
            onMouseEnter={() => onIncidentHoverChange?.(incident.id)}
            onMouseLeave={() => onIncidentHoverChange?.(null)}
            onFocus={() => onIncidentFocusChange?.(incident.id)}
            onBlur={() => onIncidentFocusChange?.(incident.id)}>
            <div className="flex items-center justify-between gap-2">
              {/* <p className="text-xs text-planet-dark-gray/70 font-mono m-0 truncate">
              {incident.id}
            </p> */}
              <span
                className={`text-[10px] px-2 py-1 rounded-md ${
                  incident.isActive
                    ? 'bg-fire-orange text-white'
                    : 'bg-planet-dark-gray text-white'
                }`}>
                {incident.isActive ? 'Active' : 'Resolved'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-planet-dark-gray">
              <div>
                <p className="m-0 text-planet-dark-gray/60">Started</p>
                <p className="m-0 font-semibold">
                  {formatDateTime(
                    incident.startedAt,
                    incident.latitude,
                    incident.longitude,
                  )}
                </p>
              </div>
              <div>
                <p className="m-0 text-planet-dark-gray/60">Latest</p>
                <p className="m-0 font-semibold">
                  {formatDateTime(
                    incident.latestAt,
                    incident.latitude,
                    incident.longitude,
                  )}
                </p>
              </div>
              <div>
                <p className="m-0 text-planet-dark-gray/60">Fires</p>
                <p className="m-0 font-semibold">{incident.fireCount}</p>
              </div>
            </div>
          </button>
        );
      })}
    </BaseCard>
  );
}
