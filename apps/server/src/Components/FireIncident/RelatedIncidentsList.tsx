import React from 'react';
import {BaseCard} from './BaseCard';

interface RelatedIncidentListItem {
  id: string;
  isActive: boolean;
  startedAt: Date;
  latestAt: Date;
  fireCount: number;
}

interface RelatedIncidentsListProps {
  incidents: RelatedIncidentListItem[];
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function RelatedIncidentsList({incidents}: RelatedIncidentsListProps) {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <BaseCard
      className="outline outline-gray-card-border flex-col items-start gap-3"
      contentClassName="gap-3">
      <div className="w-full">
        <p className="text-[10px] font-sans font-semibold text-planet-dark-gray/50 uppercase my-0">
          RELATED SITE INCIDENTS
        </p>
        <p className="text-sm font-semibold text-planet-dark-gray my-1">
          Connected incidents ({incidents.length})
        </p>
      </div>

      {incidents.map(incident => (
        <div
          key={incident.id}
          className="w-full rounded-xl border border-gray-card-border bg-gray-page-bg/40 p-3">
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
                {formatDateTime(incident.startedAt)}
              </p>
            </div>
            <div>
              <p className="m-0 text-planet-dark-gray/60">Latest</p>
              <p className="m-0 font-semibold">
                {formatDateTime(incident.latestAt)}
              </p>
            </div>
            <div>
              <p className="m-0 text-planet-dark-gray/60">Fires</p>
              <p className="m-0 font-semibold">{incident.fireCount}</p>
            </div>
          </div>
        </div>
      ))}
    </BaseCard>
  );
}
