import dynamic from 'next/dynamic';
import type { FC } from 'react';
import { memo, useState } from 'react';
import { api } from '../../utils/api';
import type { AlertIdProps } from '../../types/alert.types';
import { CollapsibleAlertCard } from './CollapsibleAlertCard';
import { HistoricAlertCards } from './HistoricAlertCards';
import classes from './AlertId.module.css';

interface Props {
  className?: string;
  alertData: AlertIdProps;
}

const MapComponent = dynamic(() => import('./MapComponent'), {ssr: false});

export const AlertId: FC<Props> = memo(function AlertIdWeb({
  alertData,
}: Props) {
  const googleMapUrl = `https://maps.google.com/?q=${alertData.latitude},${alertData.longitude}`;

  const [isCoordinatesCopied, setIsCoordinatesCopied] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(7); // in days
  const [showHistoricAlerts, setShowHistoricAlerts] = useState(false);

  const otherAlertsQuery = api.alert.getAlertsForSite.useQuery(
    {siteId: alertData?.siteId ?? '', durationInDays: selectedDuration},
    {retry: 0, enabled: !!alertData?.siteId},
  );

  const handleCopyCoordinates = (lat: string, lon: string) => {
    setIsCoordinatesCopied(true);
    void navigator.clipboard.writeText(`${lat}, ${lon}`);
    setTimeout(() => setIsCoordinatesCopied(false), 200); // reset after 200ms
  };

  return (
    <div className={classes.root}>
      <div className={classes.AlertId}>
        <div className={classes.mapView}>
          <div id="map" className={classes.mapIcon}>
            <MapComponent alertData={alertData} />
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
                  onClick={() => window.open(googleMapUrl, '_blank')}
                  type="button">
                  <div className={classes.openInGoogleMapsText}>
                    Open in Google Maps
                  </div>
                </button>
              </div>

              <br/>
              <div className={classes.buttonDiv}>
                <button
                  className={classes.googleMapsButton}
                  onClick={() => setShowHistoricAlerts(true)}
                  type="button">
                  <div className={classes.openInGoogleMapsText}>
                    See older fires
                  </div>
                </button>
              </div>
              <br/>
            </>
          ) : (
            otherAlertsQuery?.data?.data && (
              <HistoricAlertCards
                alerts={otherAlertsQuery.data.data}
                selectedDuration={selectedDuration}
                onDurationChange={setSelectedDuration}
                onCopyCoordinates={handleCopyCoordinates}
                isCoordinatesCopied={isCoordinatesCopied}
                onBack={() => setShowHistoricAlerts(false)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
});
