import type { FC } from 'react';
import { useState } from 'react';
import type { AlertForSiteData } from '../../types/alert.types';
import { CollapsibleAlertCard } from './CollapsibleAlertCard';
import classes from './AlertId.module.css';

function getTimePassedSince(date: Date): {
  days: number;
  hours: number;
  minutes: number;
} {
  const now = new Date();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const millisecondsPerHour = 60 * 60 * 1000;
  const millisecondsPerMinute = 60 * 1000;

  const timeDiff = now.getTime() - date.getTime();
  const daysPassed = Math.floor(timeDiff / millisecondsPerDay);
  const hoursPassed = Math.floor(timeDiff / millisecondsPerHour);
  const minutesPassed = Math.floor(timeDiff / millisecondsPerMinute);

  return { days: daysPassed, hours: hoursPassed, minutes: minutesPassed };
}

function formatDateString(dateString: string): string {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const hour = date.getHours();
  const minute = date.getMinutes();

  const formattedDate = `${day} ${month} ${year} at ${hour}:${minute
    .toString()
    .padStart(2, '0')}`;
  return formattedDate;
}

function getIdentityGroup(identityKey: string): string | null {
  const identityMap = new Map<string, string>([
    ['MODIS_NRT', 'MODIS'],
    ['VIIRS_NOAA20_NRT', 'VIIRS'],
    ['VIIRS_SNPP_NRT', 'VIIRS'],
    ['LANDSAT_NRT', 'LANDSAT'],
    ['GEOSTATIONARY', 'GEOSTATIONARY'],
    ['MODIS_SP', 'MODIS'],
    ['VIIRS_SNPP_SP', 'VIIRS'],
  ]);
  return identityMap.get(identityKey) ?? null;
}

export interface HistoricAlertCardsProps {
  alerts: AlertForSiteData[];
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  onCopyCoordinates: (latitude: string, longitude: string) => void;
  isCoordinatesCopied: boolean;
  onBack: () => void;
}

export const HistoricAlertCards: FC<HistoricAlertCardsProps> = ({
  alerts,
  selectedDuration,
  onDurationChange,
  onCopyCoordinates,
  isCoordinatesCopied,
  onBack,
}) => {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const handleAlertClick = (alertId: string) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };

  const handleToggle = (alertId: string) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };

  return (
    <div>
      <div className={`${classes.alertInfoSubContainer} ${classes.alertInfoSubContainerHorizontal}`}>
        <div className={classes.iconButtonDiv}>
          <button
            className={`${classes.iconButton} ${classes.googleMapsButton}  `}
            onClick={onBack}
            type="button">
            <div className={`${classes.openInGoogleMapsText} ${classes.iconButtonText}`}>←</div>
          </button>
        </div>
        <div className={classes.selectDiv}>
          <select
            className={`${classes.googleMapsButton} ${classes.durationSelect} `}
            value={selectedDuration}
            onChange={e => onDurationChange(Number(e.target.value))}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      <div >
        {alerts.map(alert => {
          const timePassed = getTimePassedSince(alert.eventDate);
          let timeAgo: string;

          if (timePassed.days > 0) {
            timeAgo = `${timePassed.days} days ago`;
          } else if (timePassed.hours > 0) {
            timeAgo = `${timePassed.hours} hours ago`;
          } else {
            timeAgo = `${timePassed.minutes} minutes ago`;
          }

          const formattedDateString = formatDateString(alert.localEventDate);
          const confidence = String(alert.confidence);
          const detectedBy = getIdentityGroup(alert.detectedBy);
          const latitude = String(alert.latitude);
          const longitude = String(alert.longitude);
          const isExpanded = expandedAlertId === alert.id;

          return (
            <CollapsibleAlertCard
              key={alert.id}
              detectedBy={detectedBy}
              timeAgo={timeAgo}
              formattedDateString={formattedDateString}
              confidence={confidence}
              latitude={latitude}
              longitude={longitude}
              collapsed={true}
              isControlled={true}
              isExpanded={isExpanded}
              onToggle={() => handleToggle(alert.id)}
              onClick={() => handleAlertClick(alert.id)}
              onCopyCoordinates={onCopyCoordinates}
              isCoordinatesCopied={isCoordinatesCopied}
            />
          );
        })}
      </div>
    </div>
  );
};

