import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { memo, useState } from 'react';
import { api } from '../../utils/api';
import type { AlertIdProps } from '../../types/alert.types';
import { CollapsibleAlertCard } from './CollapsibleAlertCard';
import { HistoricAlertCards } from './HistoricAlertCards';
import { DEFAULT_DURATION } from './durationOptions.utils';
import classes from './AlertId.module.css';

interface Props {
  className?: string;
  alertData: AlertIdProps;
}

const MapComponent = dynamic(() => import('./MapComponent'), {ssr: false});

export const AlertId: FC<Props> = memo(function AlertIdWeb({
  alertData,
}: Props) {
  const [isCoordinatesCopied, setIsCoordinatesCopied] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
  const [showHistoricAlerts, setShowHistoricAlerts] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // Convert duration to days for API (0 means today, which should be handled as 1 day for API)
  // The API expects durationInDays, so for "Today" we pass 1, but we'll filter on the frontend if needed
  const durationForApi = selectedDuration === 0 ? 1 : selectedDuration;

  const otherAlertsQuery = api.alert.getAlertsForSite.useQuery(
    {siteId: alertData?.siteId ?? '', durationInDays: durationForApi},
    {retry: 0, enabled: !!alertData?.siteId},
  );

  const handleCopyCoordinates = (lat: string, lon: string) => {
    setIsCoordinatesCopied(true);
    void navigator.clipboard.writeText(`${lat}, ${lon}`);
    setTimeout(() => setIsCoordinatesCopied(false), 200); // reset after 200ms
  };

  const handleExpandedAlertChange = (alertId: string | null) => {
    setExpandedAlertId(alertId);
  };

  const handleBack = () => {
    setShowHistoricAlerts(false);
    setExpandedAlertId(null);
  };

  // Filter alerts based on selected duration
  const filteredAlerts = otherAlertsQuery?.data?.data
    ? selectedDuration === 0
      ? // Filter for today only
        otherAlertsQuery.data.data.filter(alert => {
          const alertDate = new Date(alert.eventDate);
          const today = new Date();
          return (
            alertDate.getFullYear() === today.getFullYear() &&
            alertDate.getMonth() === today.getMonth() &&
            alertDate.getDate() === today.getDate()
          );
        })
      : otherAlertsQuery.data.data
    : undefined;

  return (
    <div className={classes.root}>
      <div className={classes.AlertId}>
        <div className={classes.mapView}>
          <div id="map" className={classes.mapIcon}>
            <MapComponent 
              alertData={alertData}
              historicAlerts={showHistoricAlerts ? filteredAlerts : undefined}
              selectedAlertId={expandedAlertId}
              isHistoricView={showHistoricAlerts}
            />
          </div>
        </div>
        <div className={classes.alertInfo}>
          {!showHistoricAlerts ? (
            <>
              <CollapsibleAlertCard
                detectedBy={alertData.detectedBy}
                timeAgo={alertData.timeAgo}
                formattedDateString={alertData.formattedDateString}
                confidence={alertData.confidence}
                latitude={alertData.latitude}
                longitude={alertData.longitude}
                collapsed={false}
                onCopyCoordinates={handleCopyCoordinates}
                isCoordinatesCopied={isCoordinatesCopied}
              />
              
              <div className={classes.buttonDiv}>
                <button
                  className={classes.googleMapsButton}
                  onClick={() => setShowHistoricAlerts(true)}
                  type="button">
                  <div className={classes.openInGoogleMapsText}>
                    See other fires
                  </div>
                </button>
              </div>
              <br className={`${classes.block} ${classes.sm_hidden}`} />
            </>
          ) : (
            filteredAlerts && (
              <HistoricAlertCards
                alerts={filteredAlerts}
                selectedDuration={selectedDuration}
                onDurationChange={setSelectedDuration}
                onCopyCoordinates={handleCopyCoordinates}
                isCoordinatesCopied={isCoordinatesCopied}
                onBack={handleBack}
                onExpandedAlertChange={handleExpandedAlertChange}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
});
